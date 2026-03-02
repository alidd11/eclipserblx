import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GIFT-CREDITS] ${step}${detailsStr}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - strict for financial operations
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'gift-credits' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: adminUser.id });

    // Check if user is staff via user_roles table
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id);

    const isStaff = roles?.some(r => ['admin', 'staff', 'moderator', 'head_moderator'].includes(r.role));
    if (!isStaff) {
      throw new Error("Only staff members can gift credits");
    }
    logStep("Staff verification passed");

    // Parse request body
    const { targetUserId, amount, reason } = await req.json();

    // Validate targetUserId is a valid UUID
    if (!targetUserId || typeof targetUserId !== 'string' || !UUID_REGEX.test(targetUserId)) {
      throw new Error("Invalid target user ID");
    }

    // Prevent gifting to self
    if (targetUserId === adminUser.id) {
      throw new Error("Cannot gift credits to yourself");
    }

    // Validate reason length
    if (reason && (typeof reason !== 'string' || reason.length > 500)) {
      throw new Error("Reason must be under 500 characters");
    }
    
    // Validate amount (minimum £0.01, maximum £1000.00)
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || !isFinite(amountNum) || amountNum < 0.01 || amountNum > 1000) {
      throw new Error("Amount must be between £0.01 and £1000.00");
    }

    const creditAmount = Math.round(amountNum * 100) / 100;
    
    logStep("Gift request", { targetUserId, creditAmount });

    // Verify target user exists
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name")
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
      throw new Error("Failed to add credits");
    }

    logStep("Credits gifted successfully", { targetUserId, amount: creditAmount });

    // Create notification for the recipient
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: targetUserId,
        title: "🎁 You received store credit!",
        message: `You've been gifted £${creditAmount.toFixed(2)} in store credit${reason ? `: ${reason}` : ''}`,
        type: "general",
      });

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: adminUser.id,
      action: "credits_gifted",
      resource: "credit_balances",
      details: { target_user_id: targetUserId, amount: creditAmount, reason },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      amount: creditAmount,
      targetUser: {
        id: targetProfile.user_id,
        name: targetProfile.display_name,
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
