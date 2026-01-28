import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PollRequest {
  title: string;
  description?: string;
  pollType: 'poll' | 'survey';
  options: string[];
  durationHours: number;
  allowMultiple: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabase.auth.getUser(token);
      userId = claimsData?.user?.id || null;
    }

    // Fetch community webhook URL and role IDs
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["community_discord_webhook_url", "polls_discord_role_id", "community_discord_role_id"])
      .order("key");

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      const val = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : s.value;
      settingsMap[s.key] = val;
    });

    const webhookUrl = settingsMap["community_discord_webhook_url"];
    // Use polls-specific role, fall back to community role
    const roleId = settingsMap["polls_discord_role_id"] || settingsMap["community_discord_role_id"] || "";
    
    if (!webhookUrl) {
      console.error("Community Discord webhook URL not configured");
      return new Response(
        JSON.stringify({ error: "Discord webhook not configured. Please set community_discord_webhook_url in Admin → Discord Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PollRequest = await req.json();
    const { title, description, pollType, options, durationHours, allowMultiple } = body;

    if (!title || !options || options.length < 2) {
      return new Response(
        JSON.stringify({ error: "Title and at least 2 options are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate end time
    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // Build emoji reactions for voting
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    // Build options list
    const optionsText = options
      .map((opt, i) => `${numberEmojis[i]} ${opt}`)
      .join('\n');

    // Build embed
    const embed = {
      title: `📊 ${title}`,
      description: description 
        ? `${description}\n\n**Options:**\n${optionsText}` 
        : `**Options:**\n${optionsText}`,
      color: pollType === 'poll' ? 0x5865F2 : 0x57F287,
      fields: [
        {
          name: "⏰ Ends",
          value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`,
          inline: true,
        },
        {
          name: "📝 Type",
          value: allowMultiple ? "Multiple choice" : "Single choice",
          inline: true,
        },
      ],
      footer: {
        text: `Eclipse Marketplace • ${pollType === 'poll' ? 'Quick Poll' : 'Community Survey'}`,
      },
      timestamp: new Date().toISOString(),
    };

    // Ping role if configured
    const content = roleId ? `<@&${roleId}> New poll!` : "📊 New community poll!";

    console.log("Sending Discord poll...", { title, optionsCount: options.length, durationHours });

    const response = await fetch(webhookUrl + "?wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord webhook error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send Discord message", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const discordMessage = await response.json();
    const messageId = discordMessage.id;

    // Add reaction emojis for voting
    if (messageId) {
      const webhookParts = webhookUrl.split('/');
      const webhookId = webhookParts[webhookParts.length - 2];
      const webhookToken = webhookParts[webhookParts.length - 1];
      
      // Add reactions for each option
      for (let i = 0; i < options.length; i++) {
        const emoji = encodeURIComponent(numberEmojis[i]);
        try {
          await fetch(
            `https://discord.com/api/v10/channels/${discordMessage.channel_id}/messages/${messageId}/reactions/${emoji}/@me`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bot ${Deno.env.get("DISCORD_BOT_TOKEN")}`,
              },
            }
          );
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.warn("Failed to add reaction:", emoji, err);
        }
      }
    }

    // Save poll to database
    const { error: insertError } = await supabase
      .from("discord_polls")
      .insert({
        title,
        description,
        poll_type: pollType,
        options,
        duration_hours: durationHours,
        allow_multiple_answers: allowMultiple,
        discord_message_id: messageId,
        posted_at: new Date().toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'posted',
        created_by: userId,
      });

    if (insertError) {
      console.error("Failed to save poll to database:", insertError);
    }

    console.log("Poll sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Poll sent to Discord", messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending poll:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
