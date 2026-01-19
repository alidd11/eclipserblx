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
    const { roblox_user_id } = await req.json();

    if (!roblox_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing roblox_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has Roblox Premium
    const response = await fetch(
      `https://premiumfeatures.roblox.com/v1/users/${roblox_user_id}/validate-membership`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      // If the API fails, we can't determine premium status
      return new Response(
        JSON.stringify({ 
          hasPremium: false, 
          userId: roblox_user_id,
          error: "Could not verify premium status"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasPremium = await response.json();

    return new Response(
      JSON.stringify({
        hasPremium: hasPremium === true,
        userId: roblox_user_id,
      }),
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
