import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Rate limiting: 120 requests per minute (high volume from Stripe)
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    maxRequests: 120,
    windowMs: 60000,
    identifier: clientIp,
    action: 'stripe-webhook',
  });

  if (!rateLimitResult.allowed) {
    logStep("Rate limit exceeded", { ip: clientIp });
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: No signature header");
      return new Response("No signature", { status: 400 });
    }

    // Verify the webhook signature (use async version for Deno)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logStep("ERROR: Signature verification failed", { message });
      return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", { sessionId: session.id });
      
      await processPayment(supabaseAdmin, stripe, {
        paymentId: session.id,
        paymentType: "checkout_session",
        customerEmail: session.customer_details?.email || session.customer_email || "",
        metadata: session.metadata,
        amountTotal: session.amount_total,
      });
    } else if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Check if this payment intent was created via a Checkout Session
      // If so, skip it - we handle those via checkout.session.completed to avoid duplicates
      try {
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
          limit: 1,
        });
        
        if (sessions.data.length > 0) {
          logStep("Skipping payment_intent.succeeded - has associated checkout session", { 
            paymentIntentId: paymentIntent.id,
            checkoutSessionId: sessions.data[0].id 
          });
        } else {
          // This is a direct payment intent (e.g., from Apple Pay/Google Pay Payment Request)
          logStep("Processing payment_intent.succeeded (no checkout session)", { paymentIntentId: paymentIntent.id });
          
          await processPayment(supabaseAdmin, stripe, {
            paymentId: paymentIntent.id,
            paymentType: "payment_intent",
            customerEmail: paymentIntent.receipt_email || paymentIntent.metadata?.customer_email || "",
            metadata: paymentIntent.metadata,
            amountTotal: paymentIntent.amount,
          });
        }
      } catch (checkError) {
        logStep("Error checking for checkout session, processing anyway", { error: String(checkError) });
        await processPayment(supabaseAdmin, stripe, {
          paymentId: paymentIntent.id,
          paymentType: "payment_intent",
          customerEmail: paymentIntent.receipt_email || paymentIntent.metadata?.customer_email || "",
          metadata: paymentIntent.metadata,
          amountTotal: paymentIntent.amount,
        });
      }
    } else if (event.type === "charge.refunded") {
      // Handle refunds - reverse commissions and seller earnings
      const charge = event.data.object as Stripe.Charge;
      logStep("Processing charge.refunded", { chargeId: charge.id, paymentIntentId: charge.payment_intent });
      
      await processRefund(supabaseAdmin, {
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent as string | null,
        refundAmount: charge.amount_refunded,
        isFullRefund: charge.refunded,
      });
    } else {
      logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

interface PaymentData {
  paymentId: string;
  paymentType: string;
  customerEmail: string;
  metadata: Record<string, string> | null;
  amountTotal: number | null;
}

async function processPayment(
  supabase: SupabaseClient,
  stripe: Stripe,
  data: PaymentData
) {
  const { paymentId, paymentType, customerEmail, metadata, amountTotal } = data;
  
  logStep("Processing payment", { paymentId, customerEmail, amountTotal });

  // Check if order already exists
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingOrder) {
    logStep("Order already exists", { orderId: (existingOrder as { id: string }).id });
    return;
  }

  // Parse items from metadata
  let items: Array<{ id: string; name: string; price: number; category_slug?: string }> = [];
  if (metadata?.items) {
    try {
      items = JSON.parse(metadata.items);
      logStep("Parsed items from metadata", { itemCount: items.length });
    } catch (e) {
      logStep("Failed to parse items from metadata", { error: String(e) });
    }
  }

  // If no items in metadata and it's a checkout session, try to get line items
  if (items.length === 0 && paymentType === "checkout_session") {
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(paymentId);
      items = lineItems.data.map((item: Stripe.LineItem) => ({
        id: item.price?.product as string || "",
        name: item.description || "Unknown Product",
        price: (item.amount_total || 0) / 100,
      }));
      logStep("Retrieved line items from Stripe", { itemCount: items.length });
    } catch (e) {
      logStep("Failed to get line items", { error: String(e) });
    }
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const total = amountTotal ? amountTotal / 100 : subtotal;

  // Get user ID from metadata or look up by email
  let userId: string | null = metadata?.user_id || null;
  if (!userId && customerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", customerEmail)
      .maybeSingle();
    
    if (profile) {
      userId = (profile as { user_id: string }).user_id;
      logStep("Found user by email", { userId });
    }
  }

  // Determine payment method - must match check constraint: stripe, paypal, klarna, apple_pay, google_pay
  let paymentMethod = "stripe";
  if (paymentType === "checkout_session") {
    try {
      const session = await stripe.checkout.sessions.retrieve(paymentId, {
        expand: ["payment_intent"],
      });
      const pi = session.payment_intent as Stripe.PaymentIntent;
      if (pi?.payment_method_types?.includes("paypal")) {
        paymentMethod = "paypal";
      } else if (pi?.payment_method_types?.includes("klarna")) {
        paymentMethod = "klarna";
      }
      // Check for wallet types (Apple Pay / Google Pay)
      if (pi?.payment_method) {
        const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string);
        if (pm.type === 'card' && pm.card?.wallet?.type === 'apple_pay') {
          paymentMethod = 'apple_pay';
        } else if (pm.type === 'card' && pm.card?.wallet?.type === 'google_pay') {
          paymentMethod = 'google_pay';
        }
      }
    } catch (e) {
      logStep("Could not determine payment method", { error: String(e) });
    }
  }

  // Create the order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_email: customerEmail,
      user_id: userId,
      payment_id: paymentId,
      payment_method: paymentMethod,
      status: "paid",
      subtotal,
      total,
    })
    .select()
    .single();

  if (orderError) {
    logStep("ERROR creating order", { error: orderError.message });
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  const orderId = (order as { id: string }).id;
  logStep("Order created", { orderId });

  // Create order items and track bot purchases
  const botInstallationCodes: Array<{ product_name: string; installation_code: string }> = [];
  
  if (items.length > 0) {
    // Fetch product details to get category info for bot detection
    const productIds = items.map(item => item.id).filter(Boolean);
    let productCategories: Record<string, string> = {};
    
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, category_id, categories(slug)")
        .in("id", productIds);
      
      if (products) {
        for (const p of products as unknown as Array<{ id: string; category_id: string; categories: { slug: string } | null }>) {
          if (p.categories?.slug) {
            productCategories[p.id] = p.categories.slug;
          }
        }
      }
      logStep("Fetched product categories", { productCategories });
    }
    
    const orderItems = items.map((item) => ({
      order_id: orderId,
      product_id: item.id || null,
      product_name: item.name,
      price: item.price,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      logStep("ERROR creating order items", { error: itemsError.message });
    } else {
      logStep("Order items created", { count: orderItems.length });
      
      // Generate installation codes for bot purchases
      const insertedItemsArray = insertedItems as Array<{ id: string; product_name: string }>;
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as { id: string; name: string; price: number; category_slug?: string };
        // Check category from metadata, database lookup, or name fallback
        const dbCategorySlug = item.id ? productCategories[item.id] : undefined;
        const isBotPurchase = item.category_slug === 'bots' || dbCategorySlug === 'bots' || item.name.toLowerCase().includes('bot');
        
        logStep("Checking if bot purchase", { 
          product: item.name, 
          metadataSlug: item.category_slug, 
          dbSlug: dbCategorySlug, 
          isBotPurchase 
        });
        
        if (isBotPurchase && insertedItemsArray[i]) {
          // Generate unique installation code
          const { data: codeResult } = await supabase.rpc('generate_installation_code');
          const installationCode = codeResult as string;
          
          if (installationCode) {
            const { error: codeError } = await supabase
              .from("bot_installation_codes")
              .insert({
                order_id: orderId,
                order_item_id: insertedItemsArray[i].id,
                user_id: userId,
                installation_code: installationCode,
                product_name: item.name,
              });
            
            if (codeError) {
              logStep("ERROR creating installation code", { error: codeError.message });
            } else {
              botInstallationCodes.push({
                product_name: item.name,
                installation_code: installationCode,
              });
              logStep("Installation code created", { code: installationCode, product: item.name });
            }
          }
        }
      }
    }

    // Create review reminders for each item if user is logged in
    if (userId) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as { id: string; name: string; price: number; category_slug?: string };
        if (item.id) {
          const { error: reminderError } = await supabase
            .from("review_reminders")
            .insert({
              user_id: userId,
              order_id: orderId,
              product_id: item.id,
              product_name: item.name,
            });
          
          if (reminderError) {
            logStep("Review reminder creation error (non-fatal)", { error: reminderError.message });
          } else {
            logStep("Review reminder created", { productName: item.name });
          }
        }
      }
    }
  }

  // Send order confirmation email
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    
    // Format items for email template (needs product_name, not name)
    const emailItems = items.map(item => ({
      product_name: item.name,
      price: item.price,
      category_slug: item.category_slug,
    }));
    
    // Check if any item is a bot purchase
    const hasBotPurchase = items.some(item => 
      item.category_slug === 'bots' || item.name.toLowerCase().includes('bot')
    );
    
    const emailPayload = {
      orderId,
      customerEmail,
      items: emailItems,
      subtotal,
      total,
      paymentMethod,
      orderDate: new Date().toISOString(),
      hasBotPurchase,
      botInstallationCodes: botInstallationCodes.length > 0 ? botInstallationCodes : undefined,
    };
    
    logStep("Sending email with payload", { orderId, customerEmail, itemCount: emailItems.length });
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(emailPayload),
    });
    const responseText = await response.text();
    logStep("Email confirmation triggered", { status: response.status, response: responseText, botCodes: botInstallationCodes.length });
  } catch (e) {
    logStep("Failed to trigger email", { error: String(e) });
  }

  // Create in-app notification and send push notification to the user
  if (userId) {
    try {
      const hasBotPurchase = items.some(item => 
        item.category_slug === 'bots' || item.name.toLowerCase().includes('bot')
      );
      
      const notificationTitle = hasBotPurchase 
        ? '🤖 Bot Purchase Complete!' 
        : '🎉 Order Confirmed!';
      
      const notificationMessage = hasBotPurchase
        ? `Your bot purchase is complete! Your installation code is ready. Visit Downloads to view your code and installation instructions.`
        : `Your order has been confirmed. Visit Downloads to access your purchased products.`;
      
      // Create in-app notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notificationTitle,
          message: notificationMessage,
          type: hasBotPurchase ? 'bot_purchase' : 'order',
          link: '/downloads',
        });
      
      if (notifError) {
        logStep("ERROR creating notification", { error: notifError.message });
      } else {
        logStep("In-app notification created", { userId, type: hasBotPurchase ? 'bot_purchase' : 'order' });
      }

      // Send push notification to customer
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            user_ids: [userId],
            payload: {
              title: notificationTitle,
              body: notificationMessage,
              tag: `order-${orderId}`,
              url: '/downloads',
              requireInteraction: true,
            },
          }),
        });
        logStep("Push notification sent to customer", { status: pushResponse.status, userId });
      } catch (pushError) {
        logStep("Failed to send push notification", { error: String(pushError) });
      }

      // Send Discord order notification
      try {
        const discordUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const discordResponse = await fetch(`${discordUrl}/functions/v1/send-order-discord-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            orderId,
            userId,
            customerEmail,
            productNames: items.map(item => item.name),
            total,
          }),
        });
        logStep("Discord order notification sent", { status: discordResponse.status });
      } catch (discordError) {
        logStep("Failed to send Discord notification", { error: String(discordError) });
      }
    } catch (e) {
      logStep("Failed to create notification", { error: String(e) });
    }
  }

  // Process referral if user exists
  if (userId) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const response = await fetch(`${supabaseUrl}/functions/v1/process-referral`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        userId,
        orderId,
        orderTotal: total,
      }),
      });
      logStep("Referral processing triggered", { status: response.status });
    } catch (e) {
      logStep("Failed to process referral", { error: String(e) });
    }
  }

  logStep("Payment processing complete", { orderId });
}

interface RefundData {
  chargeId: string;
  paymentIntentId: string | null;
  refundAmount: number;
  isFullRefund: boolean;
}

async function processRefund(
  supabase: SupabaseClient,
  data: RefundData
) {
  const { chargeId, paymentIntentId, refundAmount, isFullRefund } = data;
  
  logStep("Processing refund", { chargeId, paymentIntentId, refundAmount, isFullRefund });

  // Find the order by payment_id (could be checkout session ID or payment intent ID)
  let order: { id: string; user_id: string | null; customer_email: string; status: string } | null = null;
  
  // Try to find order by payment intent ID first
  if (paymentIntentId) {
    const { data: orderByPi } = await supabase
      .from("orders")
      .select("id, user_id, customer_email, status")
      .eq("payment_id", paymentIntentId)
      .maybeSingle();
    
    if (orderByPi) {
      order = orderByPi as { id: string; user_id: string | null; customer_email: string; status: string };
    }
  }

  // If not found, look up checkout session that might have this payment intent
  if (!order && paymentIntentId) {
    // Look for orders that might have been created via checkout session
    // The payment_id stored might be the checkout session ID, not the payment intent
    // We need to check orders and match by other means or search by charge metadata
    logStep("Order not found by payment_intent, checking recent orders");
  }

  if (!order) {
    logStep("WARNING: Could not find order for refund", { chargeId, paymentIntentId });
    return;
  }

  const orderId = order.id;
  logStep("Found order for refund", { orderId, currentStatus: order.status });

  // Check if already processed
  const { data: existingRefund } = await supabase
    .from("orders")
    .select("refunded_at")
    .eq("id", orderId)
    .single();

  if (existingRefund && (existingRefund as { refunded_at: string | null }).refunded_at) {
    logStep("Refund already processed for this order", { orderId });
    return;
  }

  // Update order status
  const newStatus = isFullRefund ? "refunded" : "partially_refunded";
  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({
      status: newStatus,
      refunded_at: new Date().toISOString(),
      refund_amount: refundAmount / 100, // Convert from cents
      refund_id: chargeId,
    })
    .eq("id", orderId);

  if (orderUpdateError) {
    logStep("ERROR updating order status", { error: orderUpdateError.message });
  } else {
    logStep("Order status updated", { orderId, newStatus });
  }

  // Reverse affiliate commission using database function
  const { error: affiliateError } = await supabase.rpc('reverse_affiliate_commission', {
    p_order_id: orderId,
    p_refund_id: chargeId,
  });

  if (affiliateError) {
    logStep("ERROR reversing affiliate commission", { error: affiliateError.message });
  } else {
    logStep("Affiliate commission reversed (if any existed)", { orderId });
  }

  // Reverse seller earnings using database function
  const { error: sellerError } = await supabase.rpc('reverse_seller_earnings', {
    p_order_id: orderId,
    p_refund_id: chargeId,
  });

  if (sellerError) {
    logStep("ERROR reversing seller earnings", { error: sellerError.message });
  } else {
    logStep("Seller earnings reversed (if any existed)", { orderId });
  }

  // Create notification for user if they exist
  if (order.user_id) {
    try {
      const notificationMessage = isFullRefund
        ? "Your order has been fully refunded. The refund will appear in your account within 5-10 business days."
        : `A partial refund of £${(refundAmount / 100).toFixed(2)} has been processed for your order.`;

      await supabase
        .from('notifications')
        .insert({
          user_id: order.user_id,
          title: isFullRefund ? '💸 Order Refunded' : '💸 Partial Refund Processed',
          message: notificationMessage,
          type: 'refund',
          link: '/account#purchases',
        });

      logStep("Refund notification created", { userId: order.user_id });
    } catch (e) {
      logStep("Failed to create refund notification", { error: String(e) });
    }
  }

  logStep("Refund processing complete", { orderId, isFullRefund, refundAmount });
}
