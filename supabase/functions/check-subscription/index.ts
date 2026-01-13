import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Eclipse+ Product ID
const ECLIPSE_PLUS_PRODUCT_ID = "prod_Tm3QgFo7Wjg00o";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // First check for admin-granted subscription in local database
    const { data: localSub } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    // If there's a locally granted subscription (no stripe_subscription_id means admin-granted)
    if (localSub && !localSub.stripe_subscription_id && localSub.current_period_end) {
      const periodEnd = new Date(localSub.current_period_end);
      
      // Check if the granted subscription is still valid
      if (periodEnd > new Date()) {
        logStep("Found admin-granted subscription", { 
          userId: user.id, 
          endDate: localSub.current_period_end,
          grantedBy: localSub.granted_by,
          grantReason: localSub.grant_reason
        });

        // Check if user has claimed their free product this month
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: claim } = await supabaseClient
          .from('subscription_free_claims')
          .select('id, product_id')
          .eq('user_id', user.id)
          .eq('claim_period', currentMonth)
          .maybeSingle();

        return new Response(JSON.stringify({
          subscribed: true,
          subscriptionEnd: localSub.current_period_end,
          subscriptionId: null,
          canClaimFree: !claim,
          claimedThisMonth: !!claim,
          claimedProductId: claim?.product_id || null,
          grantedBy: localSub.granted_by,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Admin-granted subscription has expired
        logStep("Admin-granted subscription expired", { userId: user.id });
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
    logStep("Found Stripe customer", { customerId });

    // Check for active Eclipse+ subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Find Eclipse+ subscription specifically
    const eclipsePlusSub = subscriptions.data.find((sub: any) => {
      return sub.items.data.some((item: any) => {
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product?.id;
        return productId === ECLIPSE_PLUS_PRODUCT_ID;
      });
    });

    if (!eclipsePlusSub) {
      logStep("No active Eclipse+ subscription in Stripe");

      return new Response(JSON.stringify({ 
        subscribed: false,
        canClaimFree: false,
        claimedThisMonth: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptionEnd = new Date(eclipsePlusSub.current_period_end * 1000).toISOString();
    const subscriptionStart = new Date(eclipsePlusSub.current_period_start * 1000).toISOString();
    logStep("Active Eclipse+ subscription found", { 
      subscriptionId: eclipsePlusSub.id, 
      endDate: subscriptionEnd 
    });

    // Update local subscription record
    await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        stripe_subscription_id: eclipsePlusSub.id,
        stripe_customer_id: customerId,
        status: 'active',
        current_period_start: subscriptionStart,
        current_period_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    // Check if user has claimed their free product this month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const { data: claim } = await supabaseClient
      .from('subscription_free_claims')
      .select('id, product_id')
      .eq('user_id', user.id)
      .eq('claim_period', currentMonth)
      .maybeSingle();

    const claimedThisMonth = !!claim;
    const canClaimFree = !claimedThisMonth;

    logStep("Subscription check complete", { 
      subscribed: true, 
      canClaimFree, 
      claimedThisMonth,
      currentMonth 
    });

    return new Response(JSON.stringify({
      subscribed: true,
      subscriptionEnd,
      subscriptionId: eclipsePlusSub.id,
      canClaimFree,
      claimedThisMonth,
      claimedProductId: claim?.product_id || null,
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
