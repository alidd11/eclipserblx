import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - prevent promo abuse
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'claim-signup-promotion' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing signup promotion claim for user: ${user.id}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find active signup promotions
    const now = new Date().toISOString();
    const { data: promotions, error: promoError } = await supabase
      .from("promotions")
      .select("*")
      .eq("promotion_type", "signup_eclipse_plus")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`);

    if (promoError) {
      console.error("Error fetching promotions:", promoError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch promotions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!promotions || promotions.length === 0) {
      return new Response(
        JSON.stringify({ claimed: false, message: "No active promotions" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const promo of promotions) {
      // Check if max claims reached
      if (promo.max_claims && (promo.current_claims || 0) >= promo.max_claims) {
        console.log(`Promotion ${promo.id} maxed out`);
        continue;
      }

      // Check if user already claimed - use insert with conflict to prevent race conditions
      const { data: existingClaim } = await supabase
        .from("promotion_claims")
        .select("id")
        .eq("promotion_id", promo.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingClaim) {
        console.log(`User already claimed promotion ${promo.id}`);
        continue;
      }

      // Check new_users_only constraint
      if (promo.new_users_only) {
        const { data: previousOrders } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "paid")
          .limit(1);

        if (previousOrders && previousOrders.length > 0) {
          console.log("User has previous orders, not eligible for new users only promo");
          continue;
        }
      }

      // Check if user already has an active paid subscription
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingSub && existingSub.status === "active" && existingSub.stripe_subscription_id) {
        console.log("User already has paid subscription");
        continue;
      }

      // Record the claim FIRST (atomic check) - if insert fails due to unique constraint, user already claimed
      const { error: claimError } = await supabase
        .from("promotion_claims")
        .insert({
          promotion_id: promo.id,
          user_id: user.id,
        });

      if (claimError) {
        // Likely a duplicate claim (race condition handled)
        console.error("Claim insert failed (likely duplicate):", claimError);
        continue;
      }

      // Grant the subscription
      const startDate = new Date();
      const endDate = new Date(startDate);
      const days = Math.min(promo.eclipse_plus_days || 30, 365); // Cap at 365 days
      endDate.setDate(endDate.getDate() + days);

      if (existingSub) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            tier: "pro",
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            grant_reason: `Signup promotion: ${promo.name}`,
            granted_at: startDate.toISOString(),
            updated_at: startDate.toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
          // Rollback claim
          await supabase.from("promotion_claims").delete().eq("promotion_id", promo.id).eq("user_id", user.id);
          continue;
        }
      } else {
        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            status: "active",
            tier: "pro",
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            grant_reason: `Signup promotion: ${promo.name}`,
            granted_at: startDate.toISOString(),
          });

        if (insertError) {
          console.error("Error creating subscription:", insertError);
          await supabase.from("promotion_claims").delete().eq("promotion_id", promo.id).eq("user_id", user.id);
          continue;
        }
      }

      // Assign eclipse_plus_member role
      await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: "eclipse_plus_member" }, {
          onConflict: "user_id,role",
          ignoreDuplicates: true,
        });

      // Atomically increment claim count using optimistic check
      await supabase
        .from("promotions")
        .update({ current_claims: (promo.current_claims || 0) + 1 })
        .eq("id", promo.id)
        .lte("current_claims", promo.current_claims || 0); // Only if count hasn't changed

      console.log(`Successfully granted ${days} days Pro from promotion: ${promo.name}`);

      return new Response(
        JSON.stringify({
          claimed: true,
          promotion: promo.name,
          days,
          ends_at: endDate.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ claimed: false, message: "No eligible promotions" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in claim-signup-promotion:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
