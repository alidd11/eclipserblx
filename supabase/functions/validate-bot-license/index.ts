import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bot-secret",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const botSecret = Deno.env.get("BOT_API_SECRET");

  // Optional: Verify request comes from our hosted bot
  const requestBotSecret = req.headers.get("x-bot-secret");
  if (botSecret && requestBotSecret !== botSecret) {
    console.warn("[validate-bot-license] Invalid bot secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { guildId, botProductId, productId } = body;

    if (!guildId) {
      return new Response(
        JSON.stringify({ error: "Guild ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[validate-bot-license] Checking license for guild ${guildId}`);

    // Build query to find active license
    let query = supabase
      .from("bot_installation_codes")
      .select(`
        id,
        installation_code,
        license_status,
        license_expires_at,
        activated_at,
        product_name,
        bot_product_id,
        bot_products:bot_product_id (
          id,
          product_id,
          is_active
        )
      `)
      .eq("guild_id", guildId)
      .eq("license_status", "active");

    // Filter by bot product or product if provided
    if (botProductId) {
      query = query.eq("bot_product_id", botProductId);
    }

    const { data: licenses, error } = await query;

    if (error) {
      console.error("[validate-bot-license] Query error:", error);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter by productId if provided and we got results
    let validLicenses = licenses || [];
    if (productId && validLicenses.length > 0) {
      validLicenses = validLicenses.filter((l: any) => 
        l.bot_products?.product_id === productId
      );
    }

    if (validLicenses.length === 0) {
      console.log(`[validate-bot-license] No active license found for guild ${guildId}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: "no_license",
          message: "No active license found for this server" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const license = validLicenses[0] as any;

    // Check expiration
    if (license.license_expires_at && new Date(license.license_expires_at) < new Date()) {
      console.log(`[validate-bot-license] License expired for guild ${guildId}`);
      
      // Update status to expired
      await supabase
        .from("bot_installation_codes")
        .update({ license_status: "expired" })
        .eq("id", license.id);

      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: "expired",
          message: "License has expired",
          expiredAt: license.license_expires_at
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[validate-bot-license] Valid license found for guild ${guildId}`);

    return new Response(
      JSON.stringify({
        valid: true,
        license: {
          id: license.id,
          productName: license.product_name,
          activatedAt: license.activated_at,
          expiresAt: license.license_expires_at,
          botProductId: license.bot_product_id,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[validate-bot-license] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
