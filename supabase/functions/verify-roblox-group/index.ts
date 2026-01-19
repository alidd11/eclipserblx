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
    const { roblox_user_id, group_id } = await req.json();

    if (!roblox_user_id || !group_id) {
      return new Response(
        JSON.stringify({ error: "Missing roblox_user_id or group_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's groups
    const response = await fetch(
      `https://groups.roblox.com/v2/users/${roblox_user_id}/groups/roles`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          inGroup: false, 
          error: "Failed to fetch user groups from Roblox" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Find the specific group
    const groupMembership = data.data?.find(
      (g: any) => g.group?.id?.toString() === group_id.toString()
    );

    if (!groupMembership) {
      return new Response(
        JSON.stringify({ 
          inGroup: false,
          groupId: group_id,
          userId: roblox_user_id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        inGroup: true,
        groupId: group_id,
        userId: roblox_user_id,
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
