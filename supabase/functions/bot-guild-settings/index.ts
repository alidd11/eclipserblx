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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const botSecret = Deno.env.get("BOT_API_SECRET");

  // Check if this is a bot request or user request
  const requestBotSecret = req.headers.get("x-bot-secret");
  const authHeader = req.headers.get("Authorization");
  const isBotRequest = botSecret && requestBotSecret === botSecret;

  // Create appropriate client
  const supabase = isBotRequest
    ? createClient(supabaseUrl, supabaseServiceKey)
    : createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader || "" } },
      });

  try {
    const url = new URL(req.url);
    const guildId = url.searchParams.get("guild_id");
    const botProductId = url.searchParams.get("bot_product_id");

    // GET - Fetch settings
    if (req.method === "GET") {
      if (!guildId) {
        return new Response(
          JSON.stringify({ error: "Guild ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[bot-guild-settings] Fetching settings for guild ${guildId}`);

      let query = supabase
        .from("bot_guild_settings")
        .select(`
          id,
          guild_id,
          settings,
          prefix,
          enabled_features,
          disabled_features,
          created_at,
          updated_at,
          bot_product_id,
          installation_code_id,
          bot_installation_codes:installation_code_id (
            product_name,
            license_status
          )
        `)
        .eq("guild_id", guildId);

      if (botProductId) {
        query = query.eq("bot_product_id", botProductId);
      }

      const { data: settings, error } = isBotRequest
        ? await query
        : await query.maybeSingle();

      if (error) {
        console.error("[bot-guild-settings] Query error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch settings" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ settings: isBotRequest ? settings : (settings || null) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Update settings
    if (req.method === "POST") {
      const body = await req.json();
      const { guildId: bodyGuildId, botProductId: bodyBotProductId, settings, prefix, enabledFeatures, disabledFeatures } = body;

      const targetGuildId = guildId || bodyGuildId;
      const targetBotProductId = botProductId || bodyBotProductId;

      if (!targetGuildId || !targetBotProductId) {
        return new Response(
          JSON.stringify({ error: "Guild ID and Bot Product ID are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[bot-guild-settings] Updating settings for guild ${targetGuildId}`);

      // For user requests, verify they own this installation
      if (!isBotRequest) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check ownership via installation code
        const { data: ownership } = await createClient(supabaseUrl, supabaseServiceKey)
          .from("bot_guild_settings")
          .select(`
            id,
            bot_installation_codes:installation_code_id (
              user_id
            )
          `)
          .eq("guild_id", targetGuildId)
          .eq("bot_product_id", targetBotProductId)
          .maybeSingle();

        if (!ownership || (ownership.bot_installation_codes as any)?.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "You don't have permission to modify these settings" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Build update object
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (settings !== undefined) updateData.settings = settings;
      if (prefix !== undefined) updateData.prefix = prefix;
      if (enabledFeatures !== undefined) updateData.enabled_features = enabledFeatures;
      if (disabledFeatures !== undefined) updateData.disabled_features = disabledFeatures;

      const { data: updated, error: updateError } = await createClient(supabaseUrl, supabaseServiceKey)
        .from("bot_guild_settings")
        .update(updateData)
        .eq("guild_id", targetGuildId)
        .eq("bot_product_id", targetBotProductId)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error("[bot-guild-settings] Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update settings" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[bot-guild-settings] Settings updated for guild ${targetGuildId}`);

      return new Response(
        JSON.stringify({ success: true, settings: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("[bot-guild-settings] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
