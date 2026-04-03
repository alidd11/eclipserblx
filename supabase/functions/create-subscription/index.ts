import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// ─── Product type handlers ───

interface CheckoutConfig {
  priceId: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  subscriptionMetadata?: Record<string, string>;
}

async function getEclipsePlusConfig(
  supabase: any, user: any, body: any, returnOrigin: string
): Promise<CheckoutConfig> {
  const tier = body.tier || 'pro';
  const billingPeriod = body.billingPeriod || 'monthly';

  if (!['pro', 'premium', 'starter'].includes(tier)) throw new Error("Invalid tier");
  if (!['monthly', 'annual'].includes(billingPeriod)) throw new Error("Invalid billing period");

  const { data: tierData, error } = await supabase
    .from('subscription_tiers').select('*').eq('tier', tier).eq('is_active', true).maybeSingle();
  if (error || !tierData) throw new Error(`Tier '${tier}' not found or inactive`);

  const priceId = billingPeriod === 'annual' ? tierData.stripe_annual_price_id : tierData.stripe_monthly_price_id;
  if (!priceId) throw new Error(`No price configured for ${tier} ${billingPeriod}`);

  const meta = { user_id: user.id, user_email: user.email, tier, billing_period: billingPeriod };
  return {
    priceId,
    lineItems: [{ price: priceId, quantity: 1 }],
    successUrl: `${returnOrigin}/account?subscription=success&tier=${tier}`,
    cancelUrl: `${returnOrigin}/eclipse-plus?canceled=true`,
    metadata: meta,
    subscriptionMetadata: meta,
  };
}

async function getAdSubscriptionConfig(
  supabase: any, user: any, body: any, returnOrigin: string
): Promise<CheckoutConfig> {
  const { tier, billingPeriod } = body;
  if (!tier || !['basic', 'pro', 'premium'].includes(tier)) throw new Error("Invalid tier");
  if (!billingPeriod || !['monthly', 'annual'].includes(billingPeriod)) throw new Error("Invalid billing period");

  // Check existing
  const { data: existingSub } = await supabase
    .from("advertisement_subscriptions").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (existingSub) throw new Error("You already have an active advertisement subscription.");

  const { data: tierData, error } = await supabase
    .from("advertisement_tiers").select("*").eq("tier", tier).eq("is_active", true).maybeSingle();
  if (error || !tierData) throw new Error("Tier not found or inactive");

  const priceId = billingPeriod === 'annual' ? tierData.stripe_annual_price_id : tierData.stripe_monthly_price_id;
  if (!priceId) throw new Error("Price not configured for this tier");

  const meta = { type: "ad_subscription", tier, billing_period: billingPeriod, user_id: user.id };
  return {
    priceId,
    lineItems: [{ price: priceId, quantity: 1 }],
    successUrl: `${returnOrigin}/advertise?subscription_success=true`,
    cancelUrl: `${returnOrigin}/advertise?subscription_cancelled=true`,
    metadata: meta,
    subscriptionMetadata: { type: "ad_subscription", tier, user_id: user.id },
  };
}

const GLOBAL_GUARD_PRICES = {
  monthly: "price_1SyeCoCjEHxHwNl9YROPHdNC",
  annual: "price_TBD",
  additionalServerEclipsePlus: "price_1SyhypCjEHxHwNl9gA3bzFls",
  additionalServerStandard: "price_1SyjeZCjEHxHwNl9gWiP3gqd",
};

async function getGlobalGuardConfig(
  supabase: any, user: any, body: any, returnOrigin: string
): Promise<CheckoutConfig> {
  const billingPeriod = body.billingPeriod || 'monthly';
  const additionalServers = Math.max(0, Math.min(parseInt(body.additionalServers) || 0, 50));

  if (!['monthly', 'annual'].includes(billingPeriod)) throw new Error("Invalid billing period");

  const basePriceId = billingPeriod === 'annual' ? GLOBAL_GUARD_PRICES.annual : GLOBAL_GUARD_PRICES.monthly;
  if (!basePriceId || basePriceId === "price_TBD") throw new Error("Annual billing not yet available.");

  // Check existing
  const { data: existing } = await supabase
    .from('global_guard_server_usage').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (existing) throw new Error("You already have an active Global Guard subscription.");

  // Check Eclipse+ for additional server pricing
  let isEclipsePlus = false;
  const { data: sub } = await supabase
    .from('subscriptions').select('status, current_period_end')
    .eq('user_id', user.id).in('status', ['active', 'trialing']).single();
  if (sub && new Date(sub.current_period_end) > new Date()) isEclipsePlus = true;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: basePriceId, quantity: 1 }];
  if (additionalServers > 0) {
    const addPriceId = isEclipsePlus
      ? GLOBAL_GUARD_PRICES.additionalServerEclipsePlus
      : GLOBAL_GUARD_PRICES.additionalServerStandard;
    lineItems.push({ price: addPriceId, quantity: additionalServers });
  }

  const meta = { user_id: user.id, user_email: user.email, product_type: 'global_guard', additional_servers: additionalServers.toString(), billing_period: billingPeriod };
  return {
    priceId: basePriceId,
    lineItems,
    successUrl: `${returnOrigin}/guard?subscription=success`,
    cancelUrl: `${returnOrigin}/guard?subscription=canceled`,
    metadata: meta,
    subscriptionMetadata: { user_id: user.id, user_email: user.email, product_type: 'global_guard', additional_servers: additionalServers.toString() },
  };
}

const IP_SHIELD_PRICES: Record<string, string> = {
  starter: "price_1T4QCOCjEHxHwNl9Hr9uHeWe",
  pro: "price_1T4OTVCjEHxHwNl9fNIFX8kG",
  enterprise: "price_1T4OmYCjEHxHwNl9vLYAuHni",
};

async function getIPShieldConfig(
  _supabase: any, user: any, body: any, returnOrigin: string, stripe: Stripe, customerId?: string
): Promise<CheckoutConfig> {
  const tier = body.tier || "starter";
  if (!Object.keys(IP_SHIELD_PRICES).includes(tier)) throw new Error(`Invalid tier: ${tier}`);

  const priceId = IP_SHIELD_PRICES[tier];

  // Check existing IP Shield sub via Stripe
  if (customerId) {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 100 });
    const allPriceIds = Object.values(IP_SHIELD_PRICES);
    const existing = subs.data.find(sub => sub.items.data.some(item => allPriceIds.includes(item.price.id)));
    if (existing) throw new Error("You already have an active IP Shield subscription.");
  }

  return {
    priceId,
    lineItems: [{ price: priceId, quantity: 1 }],
    successUrl: `${returnOrigin}/ip-shield?subscription=success`,
    cancelUrl: `${returnOrigin}/ip-shield?subscription=cancelled`,
    metadata: { user_id: user.id, product: "ip_shield", tier },
  };
}


const SELLER_PRO_PRICES: Record<string, string> = {
  monthly: "price_1TIGYOCjEHxHwNl933p6yUid",
  annual: "price_1TIGYiCjEHxHwNl96sljbSjm",
};

async function getSellerProConfig(
  supabase: any, user: any, body: any, returnOrigin: string
): Promise<CheckoutConfig> {
  const billingPeriod = body.billingPeriod || 'monthly';
  const storeId = body.store_id || '';

  if (!['monthly', 'annual'].includes(billingPeriod)) throw new Error("Invalid billing period");

  // Check existing active seller subscription
  const { data: existing } = await supabase
    .from('seller_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (existing) throw new Error("You already have an active Eclipse Pro subscription.");

  const priceId = billingPeriod === 'annual' ? SELLER_PRO_PRICES.annual : SELLER_PRO_PRICES.monthly;
  const meta = { type: 'seller_pro', user_id: user.id, store_id: storeId };
  return {
    priceId,
    lineItems: [{ price: priceId, quantity: 1 }],
    successUrl: `${returnOrigin}/seller/pro?subscription=success`,
    cancelUrl: `${returnOrigin}/seller/pro?subscription=cancelled`,
    metadata: meta,
    subscriptionMetadata: meta,
  };
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'create-subscription' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id });

    const body = await req.json().catch(() => ({}));
    const productType = body.product_type || 'eclipse_plus';

    // Validate origin
    const origin = req.headers.get("origin");
    const allowedOrigins = ["https://eclipserblx.com", "https://www.eclipserblx.com"];
    const returnOrigin = origin && allowedOrigins.some(o => origin!.startsWith(o)) ? origin : "https://eclipserblx.com";

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find/create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    // For Eclipse+, check existing active subscription
    if (productType === 'eclipse_plus' && customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (subs.data.length > 0) throw new Error("You already have an active Eclipse+ subscription.");
    }

    // Get config based on product type
    let config: CheckoutConfig;
    switch (productType) {
      case 'eclipse_plus':
        config = await getEclipsePlusConfig(supabaseClient, user, body, returnOrigin);
        break;
      case 'ad_subscription':
        config = await getAdSubscriptionConfig(supabaseClient, user, body, returnOrigin);
        break;
      case 'global_guard':
        config = await getGlobalGuardConfig(supabaseClient, user, body, returnOrigin);
        break;
      case 'seller_pro':
        config = await getSellerProConfig(supabaseClient, user, body, returnOrigin);
        break;
      case 'ip_shield':
        config = await getIPShieldConfig(supabaseClient, user, body, returnOrigin, stripe, customerId);
        break;
      default:
        throw new Error(`Unknown product type: ${productType}`);
    }

    logStep("Creating checkout", { productType, priceId: config.priceId });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_creation: customerId ? undefined : 'always',
      line_items: config.lineItems,
      mode: "subscription",
      success_url: config.successUrl,
      cancel_url: config.cancelUrl,
      metadata: config.metadata,
    };

    if (config.subscriptionMetadata) {
      sessionParams.subscription_data = { metadata: config.subscriptionMetadata };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
