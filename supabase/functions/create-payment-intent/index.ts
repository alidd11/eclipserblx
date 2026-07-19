import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createStripeClient, createAdminSupabase, authenticateUser, getOrCreateStripeCustomer, logStep } from "../_shared/stripe-helpers.ts";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG = (step: string, d?: unknown) => logStep("CREATE-PAYMENT-INTENT", step, d);

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category_slug?: string;
  category_id?: string;
  is_pwyw?: boolean;
  custom_price?: number;
}

type PaymentType = 'checkout' | 'credits' | 'ad_pings';

interface PaymentIntentRequest {
  type?: PaymentType;
  items?: CartItem[];
  email?: string;
  discountCodeId?: string;
  amount?: number;
  herePings?: number;
  everyonePings?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'create-payment-intent' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    LOG("Function started");

    const stripe = createStripeClient();
    const supabaseClient = createAdminSupabase();

    const requestBody: PaymentIntentRequest = await req.json();
    const { type = 'checkout', items, email, discountCodeId, amount, herePings, everyonePings } = requestBody;

    // Auth
    const { userId, email: authEmail } = await authenticateUser(supabaseClient, req);
    const userEmail = authEmail || email;

    if (!userId && type !== 'checkout') throw new Error("Authentication required");

    // Customer
    const customerId = userEmail
      ? await getOrCreateStripeCustomer(stripe, userEmail, !!userId)
      : undefined;

    let amountInPence: number;
    let description: string;
    const metadata: Record<string, string> = {
      user_id: userId || "", customer_email: userEmail || "", payment_type: type,
    };

    switch (type) {
      case 'checkout': {
        if (!items?.length) throw new Error("No items provided");

        const productIds = items.map(i => i.id);
        const { data: products, error: pErr } = await supabaseClient
          .from('products')
          .select('id, name, price, category_id, is_resellable, store_id, is_pay_what_you_want, min_price')
          .in('id', productIds);
        if (pErr) throw new Error("Failed to verify product prices");

        const productMap = new Map((products || []).map((p: any) => [p.id, p]));
        let serverSubtotal = 0;
        const validatedItems: any[] = [];

        for (const item of items) {
          const product = productMap.get(item.id) as any;
          if (!product) throw new Error(`Product not found: ${item.id}`);

          let originalPrice = product.price;
          let finalPrice = originalPrice;

          if (product.is_pay_what_you_want && (item as any).custom_price !== undefined) {
            const minPrice = product.min_price || 0;
            const customPrice = Number((item as any).custom_price);
            if (customPrice < minPrice) throw new Error(`Price for "${product.name}" must be at least £${minPrice.toFixed(2)}`);
            if (customPrice > 0 && customPrice < 1) throw new Error(`Minimum paid amount is £1.00`);
            if (customPrice === 0) throw new Error(`Free orders should use the free order endpoint`);
            originalPrice = customPrice;
            finalPrice = customPrice;
          }

          validatedItems.push({ id: product.id, name: product.name, finalPrice, originalPrice, category_id: product.category_id, category_slug: item.category_slug });
          serverSubtotal += finalPrice;
        }

        // Discount codes
        let discountAmount = 0;
        if (discountCodeId) {
          const { data: discount } = await supabaseClient
            .from('discount_codes').select('*').eq('id', discountCodeId).eq('is_active', true).single();

          if (discount) {
            if (discount.restricted_to_user_id && discount.restricted_to_user_id !== userId) { /* skip */ }
            else {
              const isBoost = discount.code?.startsWith('BOOST-');
              const ADMIN_STORES = ['83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a', '9b842052-e1fd-4dfe-99bf-c7625df3e17d'];
              let canApply = true;

              if (isBoost) {
                const storeIds = validatedItems.map((i: any) => productMap.get(i.id)?.store_id).filter(Boolean);
                canApply = storeIds.length > 0 && storeIds.every((s: string) => ADMIN_STORES.includes(s));
              } else if (discount.store_id) {
                const storeIds = validatedItems.map((i: any) => productMap.get(i.id)?.store_id).filter(Boolean);
                canApply = storeIds.includes(discount.store_id);
              }

              if (canApply) {
                discountAmount = discount.discount_type === 'percentage'
                  ? (serverSubtotal * discount.discount_value) / 100
                  : Math.min(discount.discount_value, serverSubtotal);
              }
            }
          }
        }

        amountInPence = Math.round((serverSubtotal - discountAmount) * 100);
        if (amountInPence < 100) throw new Error("Minimum order amount is £1.00");

        description = `Purchase: ${validatedItems.map((i: any) => i.name).join(', ')}`;
        const compact = validatedItems.map((i: any) => ({ id: i.id, name: i.name, finalPrice: i.finalPrice }));
        let itemsJson = JSON.stringify(compact);
        if (itemsJson.length > 490) {
          itemsJson = JSON.stringify(validatedItems.map((i: any) => ({ id: i.id, p: i.finalPrice })));
          if (itemsJson.length > 490) itemsJson = itemsJson.substring(0, 490);
        }
        metadata.items = itemsJson;
        metadata.discount_code_id = discountCodeId || '';
        metadata.discount_amount = discountAmount.toString();
        break;
      }

      case 'credits': {
        const amountNum = parseFloat(String(amount));
        if (isNaN(amountNum) || amountNum < 1 || amountNum > 500) throw new Error("Amount must be between £1.00 and £500.00");
        amountInPence = Math.round(amountNum * 100);
        description = `Store Credit - £${amountNum.toFixed(2)}`;
        metadata.credit_amount = amountNum.toString();
        break;
      }

      case 'ad_pings': {
        const hereCount = Math.max(0, Math.min(100, parseInt(String(herePings)) || 0));
        const everyoneCount = Math.max(0, Math.min(100, parseInt(String(everyonePings)) || 0));
        if (hereCount === 0 && everyoneCount === 0) throw new Error("Please select at least one ping to purchase");

        const { data: adSub } = await supabaseClient.from("advertisement_subscriptions").select("*").eq("user_id", userId!).eq("status", "active").maybeSingle();
        const isTestUser = userEmail === "alicanimir1@gmail.com";
        if (!adSub && !isTestUser) throw new Error("You need an active advertisement subscription to purchase pings");

        const HERE_BASE = 79, EVERYONE_BASE = 149;
        const BULK = [{ min: 50, d: 0.30 }, { min: 25, d: 0.20 }, { min: 10, d: 0.10 }, { min: 5, d: 0.05 }];
        const discounted = (base: number, qty: number) => { const t = BULK.find(b => qty >= b.min); return t ? Math.round(base * (1 - t.d)) : base; };

        let totalPence = 0;
        if (hereCount > 0) totalPence += discounted(HERE_BASE, hereCount) * hereCount;
        if (everyoneCount > 0) totalPence += discounted(EVERYONE_BASE, everyoneCount) * everyoneCount;

        amountInPence = totalPence;
        description = `Ad Pings: ${hereCount} @here, ${everyoneCount} @everyone`;
        metadata.here_pings = hereCount.toString();
        metadata.everyone_pings = everyoneCount.toString();
        break;
      }

      default:
        throw new Error("Invalid payment type");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence!, currency: 'gbp', customer: customerId,
      receipt_email: userEmail || undefined, description: description!, metadata,
      automatic_payment_methods: { enabled: true },
      setup_future_usage: 'on_session',
    });

    LOG("PaymentIntent created", { paymentIntentId: paymentIntent.id, amount: amountInPence! });

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret, intentType: 'payment_intent',
      paymentIntentId: paymentIntent.id, amount: amountInPence!,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    LOG("ERROR", { message: msg });
    // Mask internal Stripe errors from the client
    const safeMsg = msg.toLowerCase().includes("stripe") ? "Payment service error. Please try again." : msg;
    return new Response(JSON.stringify({ error: safeMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
