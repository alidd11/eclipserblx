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
  const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'verify-roblox-badge' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const { roblox_user_id, badge_id } = await req.json();

    const userId = String(roblox_user_id ?? '');
    const badgeId = String(badge_id ?? '');

    if (!ROBLOX_ID_REGEX.test(userId) || !ROBLOX_ID_REGEX.test(badgeId)) {
      return new Response(
        JSON.stringify({ error: "Invalid roblox_user_id or badge_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://badges.roblox.com/v1/users/${userId}/badges/awarded-dates?badgeIds=${badgeId}`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ hasBadge: false, error: "Could not verify badge ownership" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const hasBadge = data.data && data.data.length > 0;

    return new Response(
      JSON.stringify({
        hasBadge,
        awardedAt: hasBadge ? data.data[0].awardedDate : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying badge ownership:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", hasBadge: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
