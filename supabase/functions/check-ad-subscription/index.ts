import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-AD-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe price IDs to tiers
const PRICE_TO_TIER: Record<string, string> = {
  'price_1SttzSCjEHxHwNl9UHABm76P': 'basic',
  'price_1Stu02CjEHxHwNl9zVFtnEK8': 'basic',
  'price_1Stu17CjEHxHwNl9CG4LHcNQ': 'pro',
  'price_1Stu1dCjEHxHwNl9FsDlCc4g': 'pro',
  'price_1Stu2FCjEHxHwNl9JtlqWHFx': 'premium',
  'price_1Stu2SCjEHxHwNl9tNsxoyHk': 'premium',
};

// Ads per month by tier
const TIER_ADS: Record<string, number> = {
  'basic': 3,
  'pro': 10,
  'premium': 30,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        subscribed: false, 
        tier: null, 
        ads_remaining: 0,
        ads_per_month: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("User not authenticated");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        tier: null,
        ads_remaining: 0,
        ads_per_month: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check local database first
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: localSub } = await supabaseAdmin
      .from("advertisement_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // If we have a local active subscription, check if it needs ads reset
    if (localSub && localSub.status === 'active') {
      const resetAt = new Date(localSub.ads_reset_at);
      const now = new Date();
      
      // Reset ads if a month has passed
      if (now.getTime() - resetAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
        await supabaseAdmin
          .from("advertisement_subscriptions")
          .update({ 
            ads_used_this_month: 0, 
            ads_reset_at: now.toISOString() 
          })
          .eq("id", localSub.id);
        
        localSub.ads_used_this_month = 0;
      }

      const adsPerMonth = TIER_ADS[localSub.tier] || 0;
      const adsRemaining = Math.max(0, adsPerMonth - (localSub.ads_used_this_month || 0));

      logStep("Found local active subscription", { tier: localSub.tier, adsRemaining });

      return new Response(JSON.stringify({
        subscribed: true,
        tier: localSub.tier,
        tier_name: localSub.tier.charAt(0).toUpperCase() + localSub.tier.slice(1),
        ads_remaining: adsRemaining,
        ads_per_month: adsPerMonth,
        ads_used: localSub.ads_used_this_month || 0,
        current_period_end: localSub.current_period_end,
        billing_period: localSub.billing_period,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check Stripe for subscription status
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        tier: null,
        ads_remaining: 0,
        ads_per_month: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Find active ad subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Find subscription with ad_subscription type
    let adSubscription: Stripe.Subscription | null = null;
    for (const sub of subscriptions.data) {
      if (sub.metadata?.type === 'ad_subscription') {
        adSubscription = sub;
        break;
      }
      // Also check by price ID
      const priceId = sub.items.data[0]?.price?.id;
      if (priceId && PRICE_TO_TIER[priceId]) {
        adSubscription = sub;
        break;
      }
    }

    if (!adSubscription) {
      logStep("No active ad subscription found");
      
      // Update local record if exists
      if (localSub) {
        await supabaseAdmin
          .from("advertisement_subscriptions")
          .update({ status: 'inactive' })
          .eq("id", localSub.id);
      }

      return new Response(JSON.stringify({ 
        subscribed: false, 
        tier: null,
        ads_remaining: 0,
        ads_per_month: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const priceId = adSubscription.items.data[0]?.price?.id;
    const tier = adSubscription.metadata?.tier || PRICE_TO_TIER[priceId!] || 'basic';
    const adsPerMonth = TIER_ADS[tier] || 3;
    const periodEnd = new Date(adSubscription.current_period_end * 1000).toISOString();
    const periodStart = new Date(adSubscription.current_period_start * 1000).toISOString();

    logStep("Active subscription found", { tier, priceId });

    // Update or create local subscription record
    const adsUsed = localSub?.ads_used_this_month || 0;
    
    await supabaseAdmin
      .from("advertisement_subscriptions")
      .upsert({
        user_id: user.id,
        tier: tier,
        status: 'active',
        stripe_subscription_id: adSubscription.id,
        stripe_customer_id: customerId,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        billing_period: adSubscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
        ads_used_this_month: adsUsed,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    const adsRemaining = Math.max(0, adsPerMonth - adsUsed);

    return new Response(JSON.stringify({
      subscribed: true,
      tier: tier,
      tier_name: tier.charAt(0).toUpperCase() + tier.slice(1),
      ads_remaining: adsRemaining,
      ads_per_month: adsPerMonth,
      ads_used: adsUsed,
      current_period_end: periodEnd,
      billing_period: adSubscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      subscribed: false, 
      tier: null,
      ads_remaining: 0,
      ads_per_month: 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 to avoid breaking the UI
    });
  }
});
