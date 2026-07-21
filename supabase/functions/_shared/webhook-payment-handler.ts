import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { logStep } from "./stripe-helpers.ts";

const LOG = (step: string, d?: unknown) => logStep("STRIPE-WEBHOOK", step, d);

export interface PaymentData {
  paymentId: string;
  paymentType: string;
  customerEmail: string;
  metadata: Record<string, string> | null;
  amountTotal: number | null;
}

export async function processPayment(
  supabase: SupabaseClient,
  stripe: Stripe,
  data: PaymentData
) {
  const { paymentId, paymentType, customerEmail, metadata, amountTotal } = data;
  LOG("Processing payment", { paymentId, paymentType, customerEmail, amountTotal });

  // Dedupe: check by payment_intent for checkout sessions
  let paymentIntentId: string | null = null;
  if (paymentType === "checkout_session") {
    try {
      const session = await stripe.checkout.sessions.retrieve(paymentId);
      paymentIntentId = session.payment_intent as string | null;
    } catch { /* continue */ }
  }

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id, payment_id")
    .or(paymentIntentId
      ? `payment_id.eq.${paymentId},payment_id.eq.${paymentIntentId}`
      : `payment_id.eq.${paymentId}`)
    .maybeSingle();

  if (existingOrder) {
    LOG("Order already exists", { orderId: (existingOrder as any).id });
    return;
  }

  // Parse items
  let items: Array<{ id: string; name: string; price: number; category_slug?: string }> = [];
  if (metadata?.items) {
    try {
      const rawItems = JSON.parse(metadata.items);
      items = rawItems.map((item: any) => ({
        id: item.id || '',
        name: item.name || 'Product',
        price: item.price ?? item.finalPrice ?? item.p ?? 0,
        category_slug: item.category_slug,
      }));
    } catch (e) {
      LOG("Failed to parse items", { error: String(e) });
    }
  }

  if (items.length === 0 && paymentType === "checkout_session") {
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(paymentId);
      items = lineItems.data.map((item: any) => ({
        id: item.price?.product as string || "",
        name: item.description || "Unknown Product",
        price: (item.amount_total || 0) / 100,
      }));
    } catch (e) {
      LOG("Failed to get line items", { error: String(e) });
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0), 0) || (amountTotal ? amountTotal / 100 : 0);
  const total = amountTotal ? amountTotal / 100 : subtotal;

  // Resolve user
  let userId: string | null = metadata?.user_id || null;
  if (!userId && customerEmail) {
    const { data: profile } = await supabase
      .from("profiles").select("user_id").eq("email", customerEmail).maybeSingle();
    if (profile) userId = (profile as any).user_id;
  }

  // Payment method detection
  let paymentMethod = "stripe";
  if (paymentType === "checkout_session") {
    try {
      const session = await stripe.checkout.sessions.retrieve(paymentId, { expand: ["payment_intent"] });
      const pi = session.payment_intent as Stripe.PaymentIntent;
      if (pi?.payment_method_types?.includes("paypal")) paymentMethod = "paypal";
      else if (pi?.payment_method_types?.includes("klarna")) paymentMethod = "klarna";
      if (pi?.payment_method) {
        const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string);
        if (pm.type === 'card' && pm.card?.wallet?.type === 'apple_pay') paymentMethod = 'apple_pay';
        else if (pm.type === 'card' && pm.card?.wallet?.type === 'google_pay') paymentMethod = 'google_pay';
      }
    } catch { /* default stripe */ }
  }

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ customer_email: customerEmail, user_id: userId, payment_id: paymentId, payment_method: paymentMethod, status: "paid", subtotal, total })
    .select().single();

  if (orderError) {
    // Unique violation on payment_id means the other fulfillment path (verify-payment)
    // won the race and already created this order — treat as already-processed, not an error.
    if (orderError.code === "23505") {
      LOG("Order already created by a concurrent request, skipping", { paymentId });
      return;
    }
    throw new Error(`Failed to create order: ${orderError.message}`);
  }
  const orderId = (order as any).id;
  LOG("Order created", { orderId });

  // Create order items + bot codes
  const botInstallationCodes: Array<{ product_name: string; installation_code: string }> = [];
  if (items.length > 0) {
    const productIds = items.map(i => i.id).filter(Boolean);
    const productCategories: Record<string, string> = {};
    if (productIds.length > 0) {
      const { data: products } = await supabase.from("products").select("id, category_id, categories(slug)").in("id", productIds);
      if (products) {
        for (const p of products as any[]) {
          if (p.categories?.slug) productCategories[p.id] = p.categories.slug;
        }
      }
    }

    const orderItems = items.map(item => ({ order_id: orderId, product_id: item.id || null, product_name: item.name, price: item.price }));
    const { data: insertedItems, error: itemsError } = await supabase.from("order_items").insert(orderItems).select();
    if (itemsError) { LOG("ERROR creating order items", { error: itemsError.message }); }
    else {
      const insertedArr = insertedItems as any[];
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as any;
        const dbSlug = item.id ? productCategories[item.id] : undefined;
        const isBot = item.category_slug === 'bots' || dbSlug === 'bots' || item.name.toLowerCase().includes('bot');
        if (isBot && insertedArr[i]) {
          const qty = item.quantity || 1;
          let botProductId: string | null = null;
          if (item.id) {
            const { data: bp } = await supabase.from("bot_products").select("id").eq("product_id", item.id).maybeSingle();
            botProductId = bp?.id || null;
          }
          for (let c = 0; c < qty; c++) {
            const { data: codeResult } = await supabase.rpc('generate_installation_code');
            if (codeResult) {
              const { error: codeErr } = await supabase.from("bot_installation_codes").insert({
                order_id: orderId, order_item_id: insertedArr[i].id, user_id: userId,
                installation_code: codeResult as string,
                product_name: qty > 1 ? `${item.name.replace(/\s*\([^)]*\)$/, '')} (License ${c + 1}/${qty})` : item.name,
                bot_product_id: botProductId,
              });
              if (!codeErr) botInstallationCodes.push({ product_name: item.name, installation_code: codeResult as string });
            }
          }
        }
      }
    }

    // Seller earnings
    await processSellerEarnings(supabase, stripe, orderId, items, data);

    // Review reminders
    if (userId) {
      for (const item of items) {
        if (item.id) {
          await supabase.from("review_reminders").insert({ user_id: userId, order_id: orderId, product_id: item.id, product_name: item.name });
        }
      }
    }
  }

  // Notifications (email, push, discord, referral)
  await sendOrderNotifications(supabase, { orderId, userId, customerEmail, items, subtotal, total, paymentMethod, botInstallationCodes });
}

async function processSellerEarnings(
  supabase: SupabaseClient, stripe: Stripe, orderId: string,
  items: Array<{ id: string; name: string; price: number }>, paymentData: PaymentData
) {
  let stripeProcessingFee = 0;
  try {
    const piId = paymentData.paymentType === 'payment_intent' ? paymentData.paymentId : null;
    if (piId) {
      const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge.balance_transaction'] });
      const bt = (pi.latest_charge as any)?.balance_transaction;
      if (bt?.fee) stripeProcessingFee = bt.fee / 100;
    } else if (paymentData.paymentType === 'checkout_session') {
      const session = await stripe.checkout.sessions.retrieve(paymentData.paymentId, { expand: ['payment_intent'] });
      const pi = session.payment_intent as any;
      if (pi?.latest_charge) {
        const charge = await stripe.charges.retrieve(typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id, { expand: ['balance_transaction'] });
        const bt = charge.balance_transaction as any;
        if (bt?.fee) stripeProcessingFee = bt.fee / 100;
      }
    }
  } catch { /* non-fatal */ }

  const sellerItems = items.filter(i => i.id);
  const count = sellerItems.length;

  for (const item of sellerItems) {
    const { data: product } = await supabase
      .from("products")
      .select("is_seller_product, store_id, price, stores(owner_id, commission_rate, custom_commission_rate, custom_rate_expires_at, free_commission_until, name)")
      .eq("id", item.id).single();

    if (!product?.store_id) continue;

    const store = (product.stores as any)?.[0] || product.stores;
    const sellerId = store?.owner_id;
    if (!sellerId) continue;

    // Determine commission rate: free promo > custom rate > store default
    const inFreePromo = store?.free_commission_until && new Date(store.free_commission_until) > new Date();
    const hasCustom = store?.custom_commission_rate != null && (!store?.custom_rate_expires_at || new Date(store.custom_rate_expires_at) > new Date());
    const rate = inFreePromo ? 0 : (hasCustom ? store.custom_commission_rate : (store?.commission_rate ?? 15));

    const { data: orderItem } = await supabase.from("order_items").select("id").eq("order_id", orderId).eq("product_id", item.id).limit(1).maybeSingle();
    const orderItemId = orderItem?.id || null;

    const { data: existingTx } = await supabase.from("seller_transactions").select("id").eq("order_id", orderId).eq("order_item_id", orderItemId).limit(1);
    if (existingTx && existingTx.length > 0) continue;

    // Use the price actually charged at checkout, not the product's current
    // catalog price — these can diverge for pay-what-you-want products or if
    // the seller edits the price between checkout and (delayed/retried) webhook delivery.
    const gross = item.price;
    const fee = count > 0 ? stripeProcessingFee / count : 0;
    // Platform absorbs Stripe fees — seller earnings based on gross price
    const earnings = Math.max(0, gross * (1 - rate / 100));
    const platformFee = gross - earnings;
    const netBefore = gross; // For record-keeping; fees come out of platform cut

    // 3-day escrow hold
    const escrowHoldUntil = new Date();
    escrowHoldUntil.setDate(escrowHoldUntil.getDate() + 3);

    await supabase.from("seller_transactions").insert({
      seller_id: sellerId, store_id: product.store_id, order_id: orderId, order_item_id: orderItemId,
      gross_amount: gross, stripe_fee: fee, net_before_commission: netBefore, platform_fee: platformFee,
      net_amount: earnings, amount: earnings, type: "sale", status: "completed",
      escrow_hold_until: escrowHoldUntil.toISOString(),
    });

    // Atomic balance update — prevents read-then-write race
    await supabase.rpc('increment_seller_pending_balance', {
      p_seller_id: sellerId,
      p_store_id: product.store_id,
      p_amount: earnings,
    });

    // Seller Discord webhook
    try {
      const { data: creds } = await supabase.from("store_credentials").select("discord_webhook_url").eq("store_id", product.store_id).single();
      if (creds?.discord_webhook_url) {
        await fetch(creds.discord_webhook_url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [{ title: "🎉 New Sale!", description: `Someone purchased **${item.name}**!`, color: 0x22c55e, fields: [
            { name: "Product", value: item.name, inline: true }, { name: "Sale Price", value: `£${gross.toFixed(2)}`, inline: true },
            { name: "Your Earnings", value: `£${earnings.toFixed(2)}`, inline: true },
          ], footer: { text: `${store?.name || 'Your Store'} • Quantis` }, timestamp: new Date().toISOString() }] }),
        });
      }
    } catch { /* non-fatal */ }
  }
}

async function sendOrderNotifications(
  supabase: SupabaseClient,
  ctx: { orderId: string; userId: string | null; customerEmail: string; items: any[]; subtotal: number; total: number; paymentMethod: string; botInstallationCodes: any[] }
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` };
  const hasBotPurchase = ctx.items.some((i: any) => i.category_slug === 'bots' || i.name?.toLowerCase().includes('bot'));

  // Email
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
      method: "POST", headers,
      body: JSON.stringify({
        orderId: ctx.orderId, customerEmail: ctx.customerEmail,
        items: ctx.items.map(i => ({ product_name: i.name, price: i.price, category_slug: i.category_slug })),
        subtotal: ctx.subtotal, total: ctx.total, paymentMethod: ctx.paymentMethod,
        orderDate: new Date().toISOString(), hasBotPurchase,
        botInstallationCodes: ctx.botInstallationCodes.length > 0 ? ctx.botInstallationCodes : undefined,
      }),
    });
  } catch { /* non-fatal */ }

  if (!ctx.userId) return;

  const title = hasBotPurchase ? '🤖 Bot Purchase Complete!' : '🎉 Order Confirmed!';
  const msg = hasBotPurchase
    ? 'Your bot purchase is complete! Your installation code is ready. Visit Downloads to view your code and installation instructions.'
    : 'Your order has been confirmed. Visit Downloads to access your purchased products.';

  // In-app + push + discord + referral (fire-and-forget)
  await supabase.from('notifications').insert({ user_id: ctx.userId, title, message: msg, type: hasBotPurchase ? 'bot_purchase' : 'order', link: '/downloads' });

  try { await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, { method: "POST", headers, body: JSON.stringify({ user_ids: [ctx.userId], payload: { title, body: msg, tag: `order-${ctx.orderId}`, url: '/downloads', requireInteraction: true } }) }); } catch {}
  try { await fetch(`${supabaseUrl}/functions/v1/send-order-discord-notification`, { method: "POST", headers, body: JSON.stringify({ orderId: ctx.orderId, userId: ctx.userId, customerEmail: ctx.customerEmail, productNames: ctx.items.map((i: any) => i.name), total: ctx.total }) }); } catch {}
  try { await fetch(`${supabaseUrl}/functions/v1/process-referral`, { method: "POST", headers, body: JSON.stringify({ userId: ctx.userId, orderId: ctx.orderId, orderTotal: ctx.total }) }); } catch {}

  // Finance server notification with real store data
  try {
    let storeName: string | null = null;
    const productIds = ctx.items.map((i: any) => i.id).filter(Boolean);
    if (productIds.length > 0) {
      const { data: prod } = await supabase.from("products").select("stores(name)").eq("id", productIds[0]).maybeSingle();
      const s = (prod as any)?.stores;
      storeName = Array.isArray(s) ? s[0]?.name : s?.name;
    }
    await fetch(`${supabaseUrl}/functions/v1/finance-notify`, { method: "POST", headers, body: JSON.stringify({ type: "new_sale", data: { orderId: ctx.orderId, userId: ctx.userId, productNames: ctx.items.map((i: any) => i.name), total: ctx.total, storeName: storeName || "Unknown" } }) });
  } catch {}
  // Update sales counter voice channel (fire-and-forget)
  try { await fetch(`${supabaseUrl}/functions/v1/update-sales-counter`, { method: "POST", headers, body: JSON.stringify({}) }); } catch {}
}
