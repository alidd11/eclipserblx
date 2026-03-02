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
  const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'verify-roblox-group' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const { roblox_user_id, group_id } = await req.json();

    const userId = String(roblox_user_id ?? '');
    const groupId = String(group_id ?? '');

    if (!ROBLOX_ID_REGEX.test(userId) || !ROBLOX_ID_REGEX.test(groupId)) {
      return new Response(
        JSON.stringify({ error: "Invalid roblox_user_id or group_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://groups.roblox.com/v2/users/${userId}/groups/roles`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ inGroup: false, error: "Failed to fetch user groups from Roblox" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const groupMembership = data.data?.find(
      (g: any) => g.group?.id?.toString() === groupId
    );

    if (!groupMembership) {
      return new Response(
        JSON.stringify({ inGroup: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        inGroup: true,
        groupName: groupMembership.group?.name,
        role: {
          id: groupMembership.role?.id,
          name: groupMembership.role?.name,
          rank: groupMembership.role?.rank,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying group membership:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", inGroup: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
