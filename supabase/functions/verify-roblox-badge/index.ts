import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roblox_user_id, badge_id } = await req.json();

    if (!roblox_user_id || !badge_id) {
      return new Response(
        JSON.stringify({ error: "Missing roblox_user_id or badge_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has a specific badge
    const response = await fetch(
      `https://badges.roblox.com/v1/users/${roblox_user_id}/badges/awarded-dates?badgeIds=${badge_id}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          hasBadge: false, 
          userId: roblox_user_id,
          badgeId: badge_id,
          error: "Could not verify badge ownership"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const hasBadge = data.data && data.data.length > 0;

    return new Response(
      JSON.stringify({
        hasBadge,
        userId: roblox_user_id,
        badgeId: badge_id,
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
