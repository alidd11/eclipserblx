import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Roblox usernames: 3-20 chars, alphanumeric + underscores
const USERNAME_REGEX = /^[a-zA-Z0-9_]{1,20}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'verify-roblox-user' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const { username } = await req.json();

    if (!username || typeof username !== "string" || !USERNAME_REGEX.test(username.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid username format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedUsername = username.trim();

    const robloxResponse = await fetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [sanitizedUsername],
          excludeBannedUsers: true,
        }),
      }
    );

    if (!robloxResponse.ok) {
      console.error("Roblox API error:", robloxResponse.status);
      return new Response(
        JSON.stringify({ error: "Failed to verify username with Roblox" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await robloxResponse.json();

    if (!data.data || data.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "Username not found on Roblox", found: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = data.data[0];

    return new Response(
      JSON.stringify({
        found: true,
        id: user.id.toString(),
        name: user.name,
        displayName: user.displayName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying Roblox user:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
