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

  // Rate limit
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'verify-roblox-premium' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const { roblox_user_id } = await req.json();

    if (!roblox_user_id || !ROBLOX_ID_REGEX.test(String(roblox_user_id))) {
      return new Response(
        JSON.stringify({ error: "Invalid roblox_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedId = String(roblox_user_id);

    const response = await fetch(
      `https://premiumfeatures.roblox.com/v1/users/${sanitizedId}/validate-membership`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ hasPremium: false, error: "Could not verify premium status" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasPremium = await response.json();

    return new Response(
      JSON.stringify({ hasPremium: hasPremium === true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying premium status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", hasPremium: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
