import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteUrl } = await req.json();

    if (!inviteUrl) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invite URL is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Extract invite code from URL
    const inviteMatch = inviteUrl.match(/(?:discord\.(?:gg|com\/invite)|discordapp\.com\/invite)\/([a-zA-Z0-9-]+)/i);
    
    if (!inviteMatch) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid Discord invite URL format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const inviteCode = inviteMatch[1];

    // Call Discord API to get invite details
    const discordResponse = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!discordResponse.ok) {
      if (discordResponse.status === 404) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invite link is invalid or expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ valid: false, error: "Failed to verify invite link" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviteData = await discordResponse.json();

    // Check if the invite expires
    // expires_at will be null for permanent invites
    if (inviteData.expires_at !== null && inviteData.expires_at !== undefined) {
      const expiresAt = new Date(inviteData.expires_at);
      const now = new Date();
      
      // If it expires, it's not permanent
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "This invite link expires. Please create a permanent invite with 'Never expire' option.",
          expiresAt: inviteData.expires_at,
          guildName: inviteData.guild?.name || null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max uses - if max_uses is set and not 0, it's not truly permanent
    if (inviteData.max_uses && inviteData.max_uses > 0) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "This invite link has a usage limit. Please create an invite with unlimited uses.",
          maxUses: inviteData.max_uses,
          guildName: inviteData.guild?.name || null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invite is permanent (no expiration, unlimited uses)
    return new Response(
      JSON.stringify({ 
        valid: true, 
        guildName: inviteData.guild?.name || null,
        guildIcon: inviteData.guild?.icon ? `https://cdn.discordapp.com/icons/${inviteData.guild.id}/${inviteData.guild.icon}.png` : null,
        memberCount: inviteData.approximate_member_count || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Discord invite validation error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "An error occurred while validating the invite" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
