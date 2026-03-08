import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROBLOX_ID_REGEX = /^\d{1,20}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{1,20}$/;

type VerifyType = 'user' | 'badge' | 'gamepass' | 'group' | 'premium';

async function verifyUser(username: string) {
  if (!username || typeof username !== "string" || !USERNAME_REGEX.test(username.trim())) {
    return { status: 400, body: { error: "Invalid username format" } };
  }

  const robloxResponse = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username.trim()], excludeBannedUsers: true }),
  });

  if (!robloxResponse.ok) {
    return { status: 502, body: { error: "Failed to verify username with Roblox" } };
  }

  const data = await robloxResponse.json();
  if (!data.data || data.data.length === 0) {
    return { status: 404, body: { error: "Username not found on Roblox", found: false } };
  }

  const user = data.data[0];
  return {
    status: 200,
    body: { found: true, id: user.id.toString(), name: user.name, displayName: user.displayName },
  };
}

async function verifyBadge(roblox_user_id: string, badge_id: string) {
  if (!ROBLOX_ID_REGEX.test(roblox_user_id) || !ROBLOX_ID_REGEX.test(badge_id)) {
    return { status: 400, body: { error: "Invalid roblox_user_id or badge_id" } };
  }

  const response = await fetch(
    `https://badges.roblox.com/v1/users/${roblox_user_id}/badges/awarded-dates?badgeIds=${badge_id}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    return { status: 200, body: { hasBadge: false, error: "Could not verify badge ownership" } };
  }

  const data = await response.json();
  const hasBadge = data.data && data.data.length > 0;
  return { status: 200, body: { hasBadge, awardedAt: hasBadge ? data.data[0].awardedDate : null } };
}

async function verifyGamepass(roblox_user_id: string, gamepass_id: string) {
  if (!ROBLOX_ID_REGEX.test(roblox_user_id) || !ROBLOX_ID_REGEX.test(gamepass_id)) {
    return { status: 400, body: { error: "Invalid roblox_user_id or gamepass_id" } };
  }

  const response = await fetch(
    `https://inventory.roblox.com/v1/users/${roblox_user_id}/items/GamePass/${gamepass_id}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    return { status: 200, body: { ownsGamepass: false, error: "Could not verify game pass ownership" } };
  }

  const data = await response.json();
  return { status: 200, body: { ownsGamepass: data.data && data.data.length > 0 } };
}

async function verifyGroup(roblox_user_id: string, group_id: string) {
  if (!ROBLOX_ID_REGEX.test(roblox_user_id) || !ROBLOX_ID_REGEX.test(group_id)) {
    return { status: 400, body: { error: "Invalid roblox_user_id or group_id" } };
  }

  const response = await fetch(
    `https://groups.roblox.com/v2/users/${roblox_user_id}/groups/roles`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    return { status: 200, body: { inGroup: false, error: "Failed to fetch user groups from Roblox" } };
  }

  const data = await response.json();
  const groupMembership = data.data?.find((g: any) => g.group?.id?.toString() === group_id);

  if (!groupMembership) {
    return { status: 200, body: { inGroup: false } };
  }

  return {
    status: 200,
    body: {
      inGroup: true,
      groupName: groupMembership.group?.name,
      role: { id: groupMembership.role?.id, name: groupMembership.role?.name, rank: groupMembership.role?.rank },
    },
  };
}

async function verifyPremium(roblox_user_id: string) {
  if (!ROBLOX_ID_REGEX.test(roblox_user_id)) {
    return { status: 400, body: { error: "Invalid roblox_user_id" } };
  }

  const response = await fetch(
    `https://premiumfeatures.roblox.com/v1/users/${roblox_user_id}/validate-membership`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    return { status: 200, body: { hasPremium: false, error: "Could not verify premium status" } };
  }

  const hasPremium = await response.json();
  return { status: 200, body: { hasPremium: hasPremium === true } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'verify-roblox' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const body = await req.json();
    const type: VerifyType = body.type;

    let result: { status: number; body: unknown };

    switch (type) {
      case 'user':
        result = await verifyUser(body.username);
        break;
      case 'badge':
        result = await verifyBadge(String(body.roblox_user_id ?? ''), String(body.badge_id ?? ''));
        break;
      case 'gamepass':
        result = await verifyGamepass(String(body.roblox_user_id ?? ''), String(body.gamepass_id ?? ''));
        break;
      case 'group':
        result = await verifyGroup(String(body.roblox_user_id ?? ''), String(body.group_id ?? ''));
        break;
      case 'premium':
        result = await verifyPremium(String(body.roblox_user_id ?? ''));
        break;
      default:
        result = { status: 400, body: { error: `Invalid verification type: ${type}` } };
    }

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in verify-roblox:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
