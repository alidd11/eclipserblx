import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROBLOX_ID_REGEX = /^\d{1,20}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'verify-roblox-gamepass' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const { roblox_user_id, gamepass_id } = await req.json();

    const userId = String(roblox_user_id ?? '');
    const passId = String(gamepass_id ?? '');

    if (!ROBLOX_ID_REGEX.test(userId) || !ROBLOX_ID_REGEX.test(passId)) {
      return new Response(
        JSON.stringify({ error: "Invalid roblox_user_id or gamepass_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://inventory.roblox.com/v1/users/${userId}/items/GamePass/${passId}`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ ownsGamepass: false, error: "Could not verify game pass ownership" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const ownsGamepass = data.data && data.data.length > 0;

    return new Response(
      JSON.stringify({ ownsGamepass }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying game pass ownership:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", ownsGamepass: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
