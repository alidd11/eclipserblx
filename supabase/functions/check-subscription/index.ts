import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.READ, identifier: clientIp, action: 'check-subscription' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for admin-granted subscription
    const { data: localSub } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (localSub && !localSub.stripe_subscription_id && localSub.current_period_end) {
      const periodEnd = new Date(localSub.current_period_end);
      
      if (periodEnd > new Date()) {
        logStep("Found admin-granted subscription");

        const discountPercent = 30;
        const freeProductsAllowed = 1;

        const currentMonth = new Date().toISOString().slice(0, 7);
        const { count: claimsCount } = await supabaseClient
          .from('subscription_free_claims')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('claim_period', currentMonth);

        const freeProductsClaimed = claimsCount || 0;

        return new Response(JSON.stringify({
          subscribed: true,
          subscriptionEnd: localSub.current_period_end,
          subscriptionId: null,
          discountPercent,
          freeProductsPerMonth: freeProductsAllowed,
          freeProductsClaimed,
          canClaimFree: freeProductsClaimed < freeProductsAllowed,
          claimedThisMonth: freeProductsClaimed > 0,
          claimedProductId: null,
          grantedBy: localSub.granted_by,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("Admin-granted subscription expired");
        await supabaseClient
          .from('subscriptions')
          .update({ status: 'inactive' })
          .eq('user_id', user.id);
      }
    }

    // Find customer by email in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        canClaimFree: false,
        claimedThisMonth: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    const activeSub = subscriptions.data[0];

    if (!activeSub) {
      logStep("No active subscription");
      return new Response(JSON.stringify({ 
        subscribed: false,
        canClaimFree: false,
        claimedThisMonth: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
    const subscriptionStart = new Date(activeSub.current_period_start * 1000).toISOString();

    const discountPercent = 30;
    const freeProductsAllowed = 1;

    // Update local subscription record
    await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        stripe_subscription_id: activeSub.id,
        stripe_customer_id: customerId,
        status: 'active',
        tier: 'pro',
        current_period_start: subscriptionStart,
        current_period_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Count claims this month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: claims, count: claimsCount } = await supabaseClient
      .from('subscription_free_claims')
      .select('id, product_id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('claim_period', currentMonth);

    const freeProductsClaimed = claimsCount || 0;
    const lastClaimedProductId = claims && claims.length > 0 ? claims[claims.length - 1]?.product_id : null;

    return new Response(JSON.stringify({
      subscribed: true,
      subscriptionEnd,
      discountPercent,
      freeProductsPerMonth: freeProductsAllowed,
      freeProductsClaimed,
      canClaimFree: freeProductsClaimed < freeProductsAllowed,
      claimedThisMonth: freeProductsClaimed > 0,
      claimedProductId: lastClaimedProductId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CHECK-SUBSCRIPTION] Error:", error);
    return new Response(JSON.stringify({ error: "Failed to check subscription" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
