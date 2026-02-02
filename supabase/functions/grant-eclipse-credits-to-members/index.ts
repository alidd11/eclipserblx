import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GRANT-ECLIPSE-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: adminUser.id });

    // Check if user is staff
    const { data: isStaff, error: staffError } = await supabaseAdmin.rpc('is_staff', { 
      _user_id: adminUser.id 
    });
    
    if (staffError || !isStaff) {
      throw new Error("Only staff members can run this function");
    }
    logStep("Staff verification passed");

    // Get Stripe to find active subscribers
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    logStep("Found active subscriptions", { count: subscriptions.data.length });

    let grantedCount = 0;
    let alreadyClaimedCount = 0;
    let notFoundCount = 0;
    const results: Array<{ email: string; status: string }> = [];

    for (const subscription of subscriptions.data) {
      const customerId = subscription.customer as string;
      
      // Get customer email
      let customerEmail: string | null = null;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          customerEmail = customer.email;
        }
      } catch (e) {
        logStep("Failed to get customer", { customerId, error: String(e) });
        continue;
      }

      if (!customerEmail) {
        notFoundCount++;
        continue;
      }

      // Find user by email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("email", customerEmail)
        .maybeSingle();

      if (!profile?.user_id) {
        notFoundCount++;
        results.push({ email: customerEmail, status: 'user_not_found' });
        continue;
      }

      // Try to grant the bonus
      const { data: success, error } = await supabaseAdmin.rpc('claim_eclipse_plus_credit_bonus', {
        p_user_id: profile.user_id
      });

      if (error) {
        logStep("Error granting bonus", { userId: profile.user_id, error: error.message });
        results.push({ email: customerEmail, status: 'error' });
        continue;
      }

      if (success) {
        grantedCount++;
        results.push({ email: customerEmail, status: 'granted' });
        
        // Create notification
        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: profile.user_id,
            title: "🎁 Eclipse+ Credit Bonus!",
            message: "You've received £10 in store credit as an Eclipse+ member benefit. Enjoy shopping!",
            type: "general",
          });
          
        logStep("Granted bonus", { email: customerEmail });
      } else {
        alreadyClaimedCount++;
        results.push({ email: customerEmail, status: 'already_claimed' });
      }
    }

    logStep("Completed", { grantedCount, alreadyClaimedCount, notFoundCount });

    return new Response(JSON.stringify({ 
      success: true,
      summary: {
        totalSubscriptions: subscriptions.data.length,
        granted: grantedCount,
        alreadyClaimed: alreadyClaimedCount,
        notFound: notFoundCount,
      },
      results,
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
