import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { sendBotMessage, addMultipleReactions, buildSettingsMap } from "../_shared/discord-bot.ts";

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

    // Fetch polls channel ID, webhook URL and role IDs
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["polls_discord_channel_id", "polls_discord_webhook_url", "community_discord_webhook_url", "community_discord_channel_id", "polls_discord_role_id", "community_discord_role_id"])
      .order("key");

    const settingsMap = buildSettingsMap(settings);

    // Check for channel ID first (bot method), then webhook URL (legacy)
    const channelId = settingsMap["polls_discord_channel_id"] || settingsMap["community_discord_channel_id"];
    const webhookUrl = settingsMap["polls_discord_webhook_url"] || settingsMap["community_discord_webhook_url"];
    const roleId = settingsMap["polls_discord_role_id"] || settingsMap["community_discord_role_id"] || "";
    
    if (!channelId && !webhookUrl) {
      console.error("Discord channel ID or webhook URL not configured");
      return new Response(
        JSON.stringify({ error: "Discord not configured. Please set polls_discord_channel_id or webhook URL in Admin → Discord Settings." }),
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

    // Calculate end time and unix timestamps
    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    const currentUnixTimestamp = Math.floor(Date.now() / 1000);
    const endUnixTimestamp = Math.floor(endsAt.getTime() / 1000);

    // Build emoji reactions for voting
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    // Build options list
    const optionsText = options
      .map((opt, i) => `${numberEmojis[i]} ${opt}`)
      .join('\n');

    // Storage URL for Eclipse branding banner
    const brandingBannerUrl = `${supabaseUrl}/storage/v1/object/public/store-branding/eclipse-discord-banner.png`;

    // Build embed following the QOTD template style
    const embed = {
      title: `📊 ${pollType === 'poll' ? 'Community Poll' : 'Community Survey'}`,
      description: [
        `It is <t:${currentUnixTimestamp}:F> and we have a new ${pollType === 'poll' ? 'poll' : 'survey'} for you all to participate in!`,
        '',
        `**${title}**`,
        description ? `${description}` : '',
        '',
        '**Options:**',
        optionsText,
        '',
        `⏰ **Ends:** <t:${endUnixTimestamp}:R>`,
        `📝 **Type:** ${allowMultiple ? 'Multiple choice' : 'Single choice'}`,
        '',
        'React below to vote! 🗳️'
      ].filter(Boolean).join('\n'),
      color: pollType === 'poll' ? 0x5865F2 : 0x57F287,
      image: {
        url: brandingBannerUrl
      },
      footer: {
        text: `Eclipse Marketplace • ${pollType === 'poll' ? 'Poll' : 'Survey'}`,
      },
    };

    // Ping role if configured
    const content = roleId ? `<@&${roleId}>` : '';

    console.log("Sending Discord poll...", { title, optionsCount: options.length, durationHours });

    let messageId: string | null = null;
    let messageChannelId: string | null = null;

    // Use bot API if channel ID is configured, otherwise fall back to webhook
    if (channelId) {
      const result = await sendBotMessage(channelId, {
        content,
        embeds: [embed],
        allowed_mentions: roleId ? { roles: [roleId] } : undefined,
      });

      if (!result.success) {
        console.error("Discord bot message error:", result.error);
        return new Response(
          JSON.stringify({ error: "Failed to send Discord message", details: result.error }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      messageId = result.messageId || null;
      messageChannelId = result.channelId || null;

      // Add reactions for voting
      if (messageId && messageChannelId) {
        const emojisToAdd = numberEmojis.slice(0, options.length);
        await addMultipleReactions(messageChannelId, messageId, emojisToAdd, 300);
      }

      console.log("Poll sent successfully via bot", { messageId });
    } else {
      // Legacy webhook method
      const response = await fetch(webhookUrl + "?wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, embeds: [embed] }),
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
      messageId = discordMessage.id;
      messageChannelId = discordMessage.channel_id;

      // Add reactions for voting
      if (messageId && messageChannelId) {
        const emojisToAdd = numberEmojis.slice(0, options.length);
        await addMultipleReactions(messageChannelId, messageId, emojisToAdd, 300);
      }

      console.log("Poll sent successfully via webhook", { messageId });
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
