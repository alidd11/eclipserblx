import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encrypt/decrypt state parameter to prevent CSRF
async function encodeState(installationCodeId: string, userId: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const data = JSON.stringify({ id: installationCodeId, u: userId, t: Date.now() });
  const encoded = btoa(data);
  
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return `${encoded}.${encodeHex(new Uint8Array(signature))}`;
}

async function decodeState(state: string): Promise<{ id: string; u: string; t: number } | null> {
  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const [encoded, signature] = state.split(".");
    if (!encoded || !signature) return null;
    
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSignatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
    const expectedSignature = encodeHex(new Uint8Array(expectedSignatureBuffer));
    
    if (signature !== expectedSignature) return null;
    
    const data = JSON.parse(atob(encoded));
    // Verify state is not too old (1 hour max)
    if (Date.now() - data.t > 3600000) return null;
    
    return data;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit check - strict limit to prevent bot license abuse
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.AUTH, // 5 requests per minute - very strict for license activation
    identifier: clientIp,
    action: 'activate-bot-license',
  });

  if (!rateLimitResult.allowed) {
    console.log(`[activate-bot-license] Rate limit exceeded for IP: ${clientIp}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const discordClientId = Deno.env.get("DISCORD_CLIENT_ID")!;
  const discordClientSecret = Deno.env.get("DISCORD_CLIENT_SECRET")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Handle generating an invite URL
    if (req.method === "POST") {
      const body = await req.json();
      const { installationCodeId, userId, redirectUri } = body;

      if (!installationCodeId || !userId) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the installation code exists and belongs to this user
      const { data: code, error: codeError } = await supabase
        .from("bot_installation_codes")
        .select(`
          id,
          user_id,
          license_status,
          activated_at,
          bot_product_id,
          bot_products:bot_product_id (
            discord_application_id,
            discord_permissions,
            oauth_scopes
          )
        `)
        .eq("id", installationCodeId)
        .eq("user_id", userId)
        .maybeSingle();

      if (codeError || !code) {
        console.error("Code lookup error:", codeError);
        return new Response(
          JSON.stringify({ error: "Invalid installation code" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (code.activated_at) {
        return new Response(
          JSON.stringify({ error: "This license has already been activated", alreadyActivated: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const botProduct = code.bot_products as any;
      if (!botProduct) {
        return new Response(
          JSON.stringify({ error: "No bot product configuration found. Please contact support." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate the state parameter
      const state = await encodeState(installationCodeId, userId);

      // Build the Discord OAuth2 URL using bot-specific app ID
      const botAppId = botProduct.discord_application_id || discordClientId;
      const permissions = botProduct.discord_permissions || 8;
      const scopes = botProduct.oauth_scopes || ["bot", "applications.commands"];

      const oauthUrl = new URL("https://discord.com/oauth2/authorize");
      oauthUrl.searchParams.set("client_id", botAppId);
      oauthUrl.searchParams.set("permissions", permissions.toString());
      oauthUrl.searchParams.set("scope", scopes.join(" "));
      oauthUrl.searchParams.set("response_type", "code");
      oauthUrl.searchParams.set("redirect_uri", redirectUri || `${supabaseUrl}/functions/v1/activate-bot-license`);
      oauthUrl.searchParams.set("state", state);

      console.log(`[activate-bot-license] Generated OAuth URL for code ${installationCodeId}, using app ${botAppId}`);

      return new Response(
        JSON.stringify({ oauthUrl: oauthUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle OAuth2 callback (GET request)
    if (req.method === "GET") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const guildId = url.searchParams.get("guild_id");

      if (!code || !state || !guildId) {
        console.error("[activate-bot-license] Missing callback parameters");
        return new Response(
          generateErrorPage("Invalid callback parameters. Please try again."),
          { headers: { ...corsHeaders, "Content-Type": "text/html" } }
        );
      }

      // Decode and verify state
      const stateData = await decodeState(state);
      if (!stateData) {
        console.error("[activate-bot-license] Invalid or expired state");
        return new Response(
          generateErrorPage("Your session has expired. Please try again."),
          { headers: { ...corsHeaders, "Content-Type": "text/html" } }
        );
      }

      const installationCodeId = stateData.id;
      const userId = stateData.u;

      // Verify the installation code is still valid and get bot product details for token exchange
      const { data: installCode, error: installError } = await supabase
        .from("bot_installation_codes")
        .select(`
          id, user_id, activated_at, bot_product_id, product_name,
          bot_products:bot_product_id (
            discord_application_id
          )
        `)
        .eq("id", installationCodeId)
        .maybeSingle();

      if (installError || !installCode) {
        console.error("[activate-bot-license] Code not found:", installError);
        return new Response(
          generateErrorPage("Installation code not found."),
          { headers: { ...corsHeaders, "Content-Type": "text/html" } }
        );
      }

      if (installCode.user_id !== userId) {
        console.error("[activate-bot-license] User mismatch");
        return new Response(
          generateErrorPage("You are not authorized to activate this license."),
          { headers: { ...corsHeaders, "Content-Type": "text/html" } }
        );
      }

      if (installCode.activated_at) {
        console.log("[activate-bot-license] License already activated");
        return new Response(
          generateSuccessPage("Already Activated", "This license has already been activated for your server."),
          { headers: { ...corsHeaders, "Content-Type": "text/html" } }
        );
      }

      // Exchange code for access token to get guild info
      // Use bot-specific credentials if available
      const botProductData = installCode.bot_products as any;
      const tokenClientId = botProductData?.discord_application_id || discordClientId;
      
      // Try to get bot-specific secret, fall back to default
      // Currently supports LunarCast bot
      let tokenClientSecret = discordClientSecret;
      if (tokenClientId === "1455026162890702889") {
        const lunarcastSecret = Deno.env.get("LUNARCAST_CLIENT_SECRET");
        if (lunarcastSecret) {
          tokenClientSecret = lunarcastSecret;
        }
      }
      
      let guildName = null;
      let guildIcon = null;
      try {
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: tokenClientId,
            client_secret: tokenClientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: `${supabaseUrl}/functions/v1/activate-bot-license`,
          }),
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.guild) {
            guildName = tokenData.guild.name;
            guildIcon = tokenData.guild.icon
              ? `https://cdn.discordapp.com/icons/${guildId}/${tokenData.guild.icon}.png`
              : null;
          }
        } else {
          console.warn("[activate-bot-license] Token exchange failed:", await tokenResponse.text());
        }
      } catch (err) {
        console.warn("[activate-bot-license] Could not fetch guild info:", err);
      }

      // Activate the license
      const { error: updateError } = await supabase
        .from("bot_installation_codes")
        .update({
          guild_id: guildId,
          activated_at: new Date().toISOString(),
          license_status: "active",
          is_used: true,
          used_at: new Date().toISOString(),
          discord_guild_name: guildName,
          discord_guild_icon: guildIcon,
        })
        .eq("id", installationCodeId);

      if (updateError) {
        console.error("[activate-bot-license] Failed to update license:", updateError);
        return new Response(
          generateErrorPage("Failed to activate license. Please contact support."),
          { headers: { ...corsHeaders, "Content-Type": "text/html" } }
        );
      }

      // Create default guild settings
      if (installCode.bot_product_id) {
        await supabase.from("bot_guild_settings").upsert({
          guild_id: guildId,
          bot_product_id: installCode.bot_product_id,
          installation_code_id: installationCodeId,
          settings: {},
          prefix: "!",
        }, { onConflict: "guild_id,bot_product_id" });
      }

      console.log(`[activate-bot-license] Successfully activated license ${installationCodeId} for guild ${guildId}`);

      return new Response(
        generateSuccessPage("Bot Activated!", `Your ${installCode.product_name || "bot"} has been successfully added to ${guildName || "your server"}. You can now configure it from your dashboard.`),
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("[activate-bot-license] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateSuccessPage(title: string, message: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Eclipse</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin-bottom: 0.5rem; color: #22c55e; }
    p { color: #a1a1aa; margin-bottom: 2rem; }
    a { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #fff; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/downloads">Return to Downloads</a>
  </div>
</body>
</html>
`;
}

function generateErrorPage(message: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activation Error - Eclipse</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin-bottom: 0.5rem; color: #ef4444; }
    p { color: #a1a1aa; margin-bottom: 2rem; }
    a { display: inline-block; background: #27272a; color: #fff; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; }
    a:hover { background: #3f3f46; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>Activation Failed</h1>
    <p>${message}</p>
    <a href="/downloads">Return to Downloads</a>
  </div>
</body>
</html>
`;
}
