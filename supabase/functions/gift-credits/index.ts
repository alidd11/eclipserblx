import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GIFT-CREDITS] ${step}${detailsStr}`);
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
      throw new Error("Only staff members can gift credits");
    }
    logStep("Staff verification passed");

    // Parse request body
    const { targetUserId, amount, reason } = await req.json();
    
    if (!targetUserId) throw new Error("Target user ID is required");
    
    // Validate amount (minimum £0.01, maximum £1000.00)
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0.01 || amountNum > 1000) {
      throw new Error("Amount must be between £0.01 and £1000.00");
    }

    const creditAmount = Math.round(amountNum * 100) / 100;
    
    logStep("Gift request", { targetUserId, creditAmount, reason });

    // Verify target user exists
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, email")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      throw new Error("Target user not found");
    }

    // Add credits using the database function
    const { data: transaction, error: creditError } = await supabaseAdmin.rpc('add_credits', {
      p_user_id: targetUserId,
      p_amount: creditAmount,
      p_type: 'gift',
      p_description: reason || `Gifted by staff`,
      p_reference_id: null,
      p_gifted_by: adminUser.id,
      p_order_id: null,
    });

    if (creditError) {
      logStep("ERROR adding credits", { error: creditError.message });
      throw new Error(`Failed to add credits: ${creditError.message}`);
    }

    logStep("Credits gifted successfully", { 
      targetUserId, 
      amount: creditAmount, 
      transactionId: transaction?.id 
    });

    // Create notification for the recipient
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: targetUserId,
        title: "🎁 You received store credit!",
        message: `You've been gifted £${creditAmount.toFixed(2)} in store credit${reason ? `: ${reason}` : ''}`,
        type: "general",
      });

    return new Response(JSON.stringify({ 
      success: true, 
      amount: creditAmount,
      targetUser: {
        id: targetProfile.user_id,
        name: targetProfile.display_name,
        email: targetProfile.email,
      }
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
