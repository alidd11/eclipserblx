import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { handleCors, jsonOk, jsonError, unauthorized, internalError } from "../_shared/edge-response.ts";

const DOMAIN_PRICE_ID = "price_1T8wQ9CjEHxHwNl9JtcT4Okv";

function getStripe() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  return data?.user ?? null;
}

// ── Action: create-checkout ──
async function createCheckout(userId: string, storeId: string, origin: string) {
  const admin = getSupabaseAdmin();
  const stripe = getStripe();

  // Verify store ownership
  const { data: store } = await admin.from("stores").select("id, owner_id, name").eq("id", storeId).single();
  if (!store || store.owner_id !== userId) return jsonError("Not your store", 403);

  // Check if already has active billing
  const { data: existing } = await admin
    .from("store_domain_billing")
    .select("id, status")
    .eq("store_id", storeId)
    .eq("status", "active")
    .limit(1);
  if (existing && existing.length > 0) return jsonError("Already subscribed to custom domains", 409);

  // Get user email
  const { data: profile } = await admin.from("profiles").select("email").eq("user_id", userId).single();
  const email = profile?.email;

  // Find or create Stripe customer
  let customerId: string | undefined;
  if (email) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: customerId ? undefined : email,
    line_items: [{ price: DOMAIN_PRICE_ID, quantity: 1 }],
    mode: "subscription",
    metadata: { store_id: storeId, user_id: userId, type: "custom_domain" },
    subscription_data: {
      metadata: { store_id: storeId, user_id: userId, type: "custom_domain" },
    },
    success_url: `${origin}/seller/settings/domain?checkout=success`,
    cancel_url: `${origin}/seller/settings/domain?checkout=cancelled`,
  });

  return jsonOk({ url: session.url });
}

// ── Action: check-subscription ──
async function checkSubscription(userId: string, storeId: string) {
  const admin = getSupabaseAdmin();

  // Verify store ownership
  const { data: store } = await admin.from("stores").select("id, owner_id").eq("id", storeId).single();
  if (!store || store.owner_id !== userId) return jsonError("Not your store", 403);

  const { data: billing } = await admin
    .from("store_domain_billing")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!billing) {
    return jsonOk({ subscribed: false });
  }

  // Optionally refresh from Stripe
  if (billing.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
      const isActive = sub.status === "active" || sub.status === "trialing";
      
      if (!isActive && billing.status === "active") {
        await admin.from("store_domain_billing").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", billing.id);
        return jsonOk({ subscribed: false });
      }

      return jsonOk({
        subscribed: true,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      });
    } catch {
      // If Stripe check fails, trust DB
    }
  }

  return jsonOk({
    subscribed: true,
    current_period_end: billing.current_period_end,
  });
}

// ── Action: manage (customer portal) ──
async function manageSubscription(userId: string, storeId: string, origin: string) {
  const admin = getSupabaseAdmin();
  const stripe = getStripe();

  const { data: store } = await admin.from("stores").select("id, owner_id").eq("id", storeId).single();
  if (!store || store.owner_id !== userId) return jsonError("Not your store", 403);

  const { data: billing } = await admin
    .from("store_domain_billing")
    .select("stripe_customer_id")
    .eq("store_id", storeId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!billing?.stripe_customer_id) return jsonError("No active subscription found", 404);

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${origin}/seller/settings/domain`,
  });

  return jsonOk({ url: portalSession.url });
}

// ── Action: fulfill (called by webhook or after checkout) ──
async function fulfillSubscription(subscriptionId: string, customerId: string) {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const storeId = sub.metadata?.store_id;
  if (!storeId) return jsonError("No store_id in subscription metadata", 400);

  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
  const isActive = sub.status === "active" || sub.status === "trialing";

  // Upsert billing record
  const { data: existing } = await admin
    .from("store_domain_billing")
    .select("id")
    .eq("store_id", storeId)
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (existing) {
    await admin.from("store_domain_billing").update({
      status: isActive ? "active" : "cancelled",
      current_period_end: periodEnd,
      stripe_customer_id: customerId,
      cancelled_at: !isActive ? new Date().toISOString() : null,
    }).eq("id", existing.id);
  } else {
    // We need a store_domain_id — create a placeholder or find existing
    // For new subscriptions, we insert with a null store_domain_id initially
    await admin.from("store_domain_billing").insert({
      store_id: storeId,
      store_domain_id: null as any, // Will be linked when domain is added
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: isActive ? "active" : "cancelled",
      current_period_end: periodEnd,
    });
  }

  return jsonOk({ fulfilled: true, status: isActive ? "active" : "cancelled" });
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const origin = req.headers.get("origin") || "https://eclipserblx.com";

    // Webhook fulfillment (no auth needed, called server-side)
    if (action === "fulfill") {
      if (!body.subscription_id || !body.customer_id) return jsonError("subscription_id and customer_id required", 400);
      return await fulfillSubscription(body.subscription_id, body.customer_id);
    }

    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    switch (action) {
      case "create-checkout":
        if (!body.store_id) return jsonError("store_id required", 400);
        return await createCheckout(user.id, body.store_id, origin);

      case "check-subscription":
        if (!body.store_id) return jsonError("store_id required", 400);
        return await checkSubscription(user.id, body.store_id);

      case "manage":
        if (!body.store_id) return jsonError("store_id required", 400);
        return await manageSubscription(user.id, body.store_id, origin);

      default:
        return jsonError("Unknown action. Supported: create-checkout, check-subscription, manage, fulfill", 400);
    }
  } catch (e) {
    return internalError(e);
  }
});
