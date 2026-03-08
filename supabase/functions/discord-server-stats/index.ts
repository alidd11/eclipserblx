import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Discord invite code from settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "discord_invite_url")
      .maybeSingle();

    // Extract invite code from URL or use default
    let inviteUrl = setting?.value || "https://discord.gg/eclipserblx";
    if (typeof inviteUrl === "string") {
      inviteUrl = inviteUrl.replace(/^"|"$/g, "");
    }
    const inviteCode = inviteUrl.split("/").pop() || "eclipserblx";

    // Fetch invite with counts from Discord API (no auth needed)
    const discordRes = await fetch(
      `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`,
      { headers: { "User-Agent": "Eclipse-Bot/1.0" } }
    );

    if (!discordRes.ok) {
      console.error("Discord API error:", discordRes.status, await discordRes.text());
      return new Response(
        JSON.stringify({ 
          approximate_member_count: null, 
          approximate_presence_count: null,
          guild_name: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invite = await discordRes.json();

    return new Response(
      JSON.stringify({
        approximate_member_count: invite.approximate_member_count ?? null,
        approximate_presence_count: invite.approximate_presence_count ?? null,
        guild_name: invite.guild?.name ?? null,
        guild_icon: invite.guild?.icon
          ? `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.png?size=64`
          : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching Discord stats:", error);
    return new Response(
      JSON.stringify({ approximate_member_count: null, approximate_presence_count: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
