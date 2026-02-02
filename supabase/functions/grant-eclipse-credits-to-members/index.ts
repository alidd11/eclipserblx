import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    // Get ALL active Eclipse+ members from subscriptions table
    // This includes: Stripe subscribers, admin-granted, and promotion-claimed
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, stripe_subscription_id, granted_by, grant_reason")
      .eq("status", "active");

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    logStep("Found active Eclipse+ members", { count: subscriptions?.length || 0 });

    let grantedCount = 0;
    let alreadyClaimedCount = 0;
    let errorCount = 0;
    const results: Array<{ userId: string; source: string; status: string }> = [];

    for (const subscription of subscriptions || []) {
      const userId = subscription.user_id;
      
      // Determine source of subscription
      let source = 'unknown';
      if (subscription.stripe_subscription_id) {
        source = 'stripe';
      } else if (subscription.granted_by) {
        source = 'admin_granted';
      } else if (subscription.grant_reason?.includes('promotion')) {
        source = 'promotion';
      } else {
        source = 'other';
      }

      // Try to grant the bonus
      const { data: success, error } = await supabaseAdmin.rpc('claim_eclipse_plus_credit_bonus', {
        p_user_id: userId
      });

      if (error) {
        logStep("Error granting bonus", { userId, error: error.message });
        results.push({ userId, source, status: 'error' });
        errorCount++;
        continue;
      }

      if (success) {
        grantedCount++;
        results.push({ userId, source, status: 'granted' });
        
        // Create notification
        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: userId,
            title: "🎁 Eclipse+ Credit Bonus!",
            message: "You've received £10 in store credit as an Eclipse+ member benefit. Enjoy shopping!",
            type: "general",
          });
          
        logStep("Granted bonus", { userId, source });
      } else {
        alreadyClaimedCount++;
        results.push({ userId, source, status: 'already_claimed' });
      }
    }

    logStep("Completed", { grantedCount, alreadyClaimedCount, errorCount });

    return new Response(JSON.stringify({ 
      success: true,
      summary: {
        totalMembers: subscriptions?.length || 0,
        granted: grantedCount,
        alreadyClaimed: alreadyClaimedCount,
        errors: errorCount,
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
