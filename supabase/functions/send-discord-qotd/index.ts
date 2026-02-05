import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
 import { sendBotMessage, createThread, buildSettingsMap } from '../_shared/discord-bot.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { question, qotdId, category, staffUserId, staffDiscordId, staffDiscordDisplayName } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    if (!staffDiscordId) {
      throw new Error('Staff Discord ID is required - please link your Discord account first');
    }

    // Get the QOTD channel ID, webhook URL and role IDs
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['qotd_discord_channel_id', 'qotd_discord_webhook_url', 'community_discord_webhook_url', 'community_discord_channel_id', 'qotd_discord_role_id', 'discord_ping_role_id']);

    const settingsMap = buildSettingsMap(settings);

    // Check for channel ID first (bot method), then webhook URL (legacy)
    const channelId = settingsMap.qotd_discord_channel_id || settingsMap.community_discord_channel_id;
    const webhookUrl = settingsMap.qotd_discord_webhook_url || settingsMap.community_discord_webhook_url;
    
    if (!channelId && !webhookUrl) {
      throw new Error('QOTD Discord not configured - please set channel ID or webhook URL in Admin → Discord Settings → QOTD tab');
    }

    // Use QOTD-specific role, fall back to default role
    const roleId = settingsMap.qotd_discord_role_id || settingsMap.discord_ping_role_id;

    // Get current Unix timestamp for Discord's dynamic time formatting
    const unixTimestamp = Math.floor(Date.now() / 1000);

    // Storage URL for Eclipse branding banner
    const brandingBannerUrl = `${supabaseUrl}/storage/v1/object/public/store-branding/eclipse-discord-banner.png`;

    // Create Discord embed following the reference template
    const embed = {
      title: '❓ Question Of The Day',
      description: [
        `It is <t:${unixTimestamp}:F> and time for a new daily question of the day for you all to answer.`,
        '',
        `**The question of today is : ${question}**`,
        '',
        'Please Answer In the thread below! 💬',
        '',
        'Thank You,',
        `<@${staffDiscordId}>`
      ].join('\n'),
      color: 0x5865F2, // Discord blurple
      image: {
        url: brandingBannerUrl
      },
      footer: {
        text: 'Eclipse Marketplace • QOTD'
      }
    };

    // Build message content with optional role ping
    let content = '';
    if (roleId) {
      content = `<@&${roleId}>`;
    }

    let discordMessageId: string | null = null;
    let messageChannelId: string | null = null;
    let threadId: string | null = null;

    // Use bot API if channel ID is configured, otherwise fall back to webhook
    if (channelId) {
      const result = await sendBotMessage(channelId, {
        content,
        embeds: [embed],
        allowed_mentions: roleId ? { roles: [roleId] } : undefined,
      });

      if (!result.success) {
        throw new Error(`Discord bot message failed: ${result.error}`);
      }

      discordMessageId = result.messageId || null;
      messageChannelId = result.channelId || null;

      // Create thread on the message
      if (discordMessageId && messageChannelId) {
        const threadResult = await createThread(messageChannelId, discordMessageId, '💬 QOTD Discussion', 1440);
        threadId = threadResult?.threadId || null;
      }

      console.log('QOTD posted successfully via bot:', question);
    } else {
      // Legacy webhook method
      const webhookWithWait = webhookUrl.includes('?') 
        ? `${webhookUrl}&wait=true`
        : `${webhookUrl}?wait=true`;

      const webhookResponse = await fetch(webhookWithWait, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, embeds: [embed] })
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(`Discord webhook failed: ${errorText}`);
      }

      const messageData = await webhookResponse.json();
      discordMessageId = messageData.id;
      messageChannelId = messageData.channel_id;

      // Create thread on the message
      if (discordMessageId && messageChannelId) {
        const threadResult = await createThread(messageChannelId, discordMessageId, '💬 QOTD Discussion', 1440);
        threadId = threadResult?.threadId || null;
      }

      console.log('QOTD posted successfully via webhook:', question);
    }
    
    // Update the QOTD record with discord message ID
    if (qotdId) {
      await supabase
        .from('discord_qotd')
        .update({ 
          discord_message_id: discordMessageId,
          status: 'posted',
          posted_at: new Date().toISOString()
        })
        .eq('id', qotdId);
    }
    return new Response(
      JSON.stringify({ success: true, message: 'QOTD posted to Discord', threadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error posting QOTD:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
