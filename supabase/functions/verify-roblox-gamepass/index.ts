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
    const { roblox_user_id, gamepass_id } = await req.json();

    if (!roblox_user_id || !gamepass_id) {
      return new Response(
        JSON.stringify({ error: "Missing roblox_user_id or gamepass_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user owns a specific game pass
    const response = await fetch(
      `https://inventory.roblox.com/v1/users/${roblox_user_id}/items/GamePass/${gamepass_id}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          ownsGamepass: false, 
          userId: roblox_user_id,
          gamepassId: gamepass_id,
          error: "Could not verify game pass ownership"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const ownsGamepass = data.data && data.data.length > 0;

    return new Response(
      JSON.stringify({
        ownsGamepass,
        userId: roblox_user_id,
        gamepassId: gamepass_id,
      }),
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
