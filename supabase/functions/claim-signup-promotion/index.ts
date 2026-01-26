import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get the user from the auth header
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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing signup promotion claim for user: ${user.id}`);

    // Use service role for database operations
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
      console.log("No active signup promotions found");
      return new Response(
        JSON.stringify({ claimed: false, message: "No active promotions" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check each promotion for eligibility
    for (const promo of promotions) {
      // Check if max claims reached
      if (promo.max_claims && (promo.current_claims || 0) >= promo.max_claims) {
        console.log(`Promotion ${promo.id} maxed out`);
        continue;
      }

      // Check if user already claimed this promotion
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
        // Check if user has any previous orders
        const { data: previousOrders, error: ordersError } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "paid")
          .limit(1);

        if (ordersError) {
          console.error("Error checking orders:", ordersError);
          continue;
        }

        if (previousOrders && previousOrders.length > 0) {
          console.log("User has previous orders, not eligible for new users only promo");
          continue;
        }
      }

      // Check if user already has an active Eclipse+ subscription
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingSub && existingSub.status === "active" && existingSub.stripe_subscription_id) {
        console.log("User already has paid Eclipse+ subscription");
        continue;
      }

      // Grant the Eclipse+ subscription
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (promo.eclipse_plus_days || 30));

      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            grant_reason: `Signup promotion: ${promo.name}`,
            granted_at: startDate.toISOString(),
            updated_at: startDate.toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
          continue;
        }
      } else {
        // Create new subscription
        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            status: "active",
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            grant_reason: `Signup promotion: ${promo.name}`,
            granted_at: startDate.toISOString(),
          });

        if (insertError) {
          console.error("Error creating subscription:", insertError);
          continue;
        }
      }

      // Record the claim
      const { error: claimError } = await supabase
        .from("promotion_claims")
        .insert({
          promotion_id: promo.id,
          user_id: user.id,
        });

      if (claimError) {
        console.error("Error recording claim:", claimError);
        // Don't fail - subscription was granted
      }

      // Increment claim count
      await supabase
        .from("promotions")
        .update({ current_claims: (promo.current_claims || 0) + 1 })
        .eq("id", promo.id);

      console.log(`Successfully granted ${promo.eclipse_plus_days} days Eclipse+ from promotion: ${promo.name}`);

      return new Response(
        JSON.stringify({
          claimed: true,
          promotion: promo.name,
          days: promo.eclipse_plus_days,
          ends_at: endDate.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No eligible promotions
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
