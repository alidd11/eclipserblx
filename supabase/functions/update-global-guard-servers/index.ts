import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Global Guard Stripe Price IDs
const ADDITIONAL_SERVER_PRICE_ID = "price_1SyhypCjEHxHwNl9gA3bzFls"; // £1.00/month per extra server

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-GLOBAL-GUARD-SERVERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const action = body.action; // 'add' or 'remove'
    const serverCount = Math.max(1, parseInt(body.serverCount) || 1);

    if (!['add', 'remove'].includes(action)) {
      throw new Error("Invalid action. Use 'add' or 'remove'");
    }

    logStep("Server update request", { action, serverCount });

    // Get user's current subscription
    const { data: usage, error: usageError } = await supabaseClient
      .from('global_guard_server_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (usageError || !usage) {
      throw new Error("No active Global Guard subscription found. Please subscribe first.");
    }

    if (!usage.stripe_subscription_id) {
      throw new Error("Subscription not linked to Stripe. Please contact support.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(usage.stripe_subscription_id);
    
    // Find the additional servers subscription item
    let additionalServersItem = subscription.items.data.find(
      item => item.price.id === ADDITIONAL_SERVER_PRICE_ID
    );

    if (action === 'add') {
      if (additionalServersItem) {
        // Update existing quantity
        const newQuantity = (additionalServersItem.quantity || 0) + serverCount;
        await stripe.subscriptionItems.update(additionalServersItem.id, {
          quantity: newQuantity,
        });
        logStep("Updated additional servers quantity", { newQuantity });
      } else {
        // Add new subscription item for additional servers
        await stripe.subscriptionItems.create({
          subscription: usage.stripe_subscription_id,
          price: ADDITIONAL_SERVER_PRICE_ID,
          quantity: serverCount,
        });
        logStep("Added additional servers item", { quantity: serverCount });
      }

      // Update local record
      await supabaseClient
        .from('global_guard_server_usage')
        .update({ 
          additional_servers: usage.additional_servers + serverCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usage.id);

    } else if (action === 'remove') {
      if (!additionalServersItem || (additionalServersItem.quantity || 0) === 0) {
        throw new Error("No additional servers to remove");
      }

      const currentQuantity = additionalServersItem.quantity || 0;
      const newQuantity = Math.max(0, currentQuantity - serverCount);

      if (newQuantity === 0) {
        // Remove the item entirely
        await stripe.subscriptionItems.del(additionalServersItem.id);
        logStep("Removed additional servers item");
      } else {
        // Update quantity
        await stripe.subscriptionItems.update(additionalServersItem.id, {
          quantity: newQuantity,
        });
        logStep("Updated additional servers quantity", { newQuantity });
      }

      // Update local record
      await supabaseClient
        .from('global_guard_server_usage')
        .update({ 
          additional_servers: Math.max(0, usage.additional_servers - serverCount),
          updated_at: new Date().toISOString(),
        })
        .eq('id', usage.id);
    }

    // Fetch updated usage
    const { data: updatedUsage } = await supabaseClient
      .from('global_guard_server_usage')
      .select('*')
      .eq('id', usage.id)
      .single();

    return new Response(JSON.stringify({ 
      success: true,
      usage: updatedUsage,
      message: action === 'add' 
        ? `Added ${serverCount} server slot(s). Your bill will be adjusted.`
        : `Removed ${serverCount} server slot(s). Your bill will be adjusted.`,
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
