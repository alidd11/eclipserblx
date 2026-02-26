import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FULFILL-FREE-ORDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.WRITE,
      identifier: clientIp,
      action: 'fulfill-free-order',
    });

    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const { items } = await req.json();

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Fetch products from DB and validate they are all genuinely free (PWYW with custom_price = 0)
    const productIds = items.map((i: any) => i.id);
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name, price, is_pay_what_you_want, min_price, store_id, category_id')
      .in('id', productIds);

    if (productsError || !products) {
      throw new Error("Failed to verify products");
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate every item
    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) {
        throw new Error(`Product not found: ${item.id}`);
      }

      // Must be PWYW
      if (!product.is_pay_what_you_want) {
        throw new Error(`Product "${product.name}" is not Pay What You Want`);
      }

      // Min price must be 0
      if ((product.min_price || 0) > 0) {
        throw new Error(`Product "${product.name}" has a minimum price`);
      }

      // Check the buyer isn't trying to sneak a paid item through as free
      const customPrice = item.custom_price ?? 0;
      if (customPrice !== 0) {
        throw new Error(`This endpoint only handles free orders. Use normal checkout for paid orders.`);
      }
    }

    logStep("All products validated as free PWYW");

    // Check for duplicate purchases — prevent claiming same free product twice
    for (const item of items) {
      const { data: existingOrder } = await supabaseClient
        .from('order_items')
        .select('id, orders!inner(user_id, status)')
        .eq('product_id', item.id)
        .eq('orders.user_id', user.id)
        .in('orders.status', ['paid', 'completed'])
        .limit(1);

      if (existingOrder && existingOrder.length > 0) {
        const product = productMap.get(item.id);
        throw new Error(`You already own "${product?.name || item.id}"`);
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        customer_email: user.email,
        subtotal: 0,
        discount_amount: 0,
        total: 0,
        status: 'paid',
        payment_method: 'free_pwyw',
        payment_id: `free_pwyw_${Date.now()}_${user.id}`,
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    logStep("Order created", { orderId: order.id });

    // Create order items
    const orderItems = items.map((item: any) => {
      const product = productMap.get(item.id)!;
      return {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        price: 0,
      };
    });

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // Create notification
    const productNames = items.map((i: any) => productMap.get(i.id)?.name).filter(Boolean);
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'order',
        title: 'Free Products Claimed!',
        message: `You've claimed: ${productNames.join(', ')}`,
        link: '/downloads',
      });

    logStep("Free order complete", { orderId: order.id, itemCount: items.length });

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
