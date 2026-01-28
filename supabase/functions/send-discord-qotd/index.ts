import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get the QOTD webhook URL (or fall back to community webhook) and role IDs
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['qotd_discord_webhook_url', 'community_discord_webhook_url', 'qotd_discord_role_id', 'discord_ping_role_id']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : s.value;
    });

    // Use QOTD-specific webhook, fall back to community webhook
    const webhookUrl = settingsMap.qotd_discord_webhook_url || settingsMap.community_discord_webhook_url;
    
    if (!webhookUrl) {
      throw new Error('QOTD Discord webhook not configured - please set it in Admin → Discord Settings → QOTD tab');
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

    // Use ?wait=true to get the message ID back for thread creation
    const webhookWithWait = webhookUrl.includes('?') 
      ? `${webhookUrl}&wait=true`
      : `${webhookUrl}?wait=true`;

    // Send to Discord
    const webhookResponse = await fetch(webhookWithWait, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        embeds: [embed]
      })
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      throw new Error(`Discord webhook failed: ${errorText}`);
    }

    // Get the message response to create a thread
    const messageData = await webhookResponse.json();
    const discordMessageId = messageData.id;
    const channelId = messageData.channel_id;

    // Create a thread on the message
    let threadId = null;
    if (discordMessageId && channelId) {
      const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
      if (botToken) {
        try {
          // Create a public thread from the message
          const threadResponse = await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages/${discordMessageId}/threads`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: `💬 QOTD Discussion`,
                auto_archive_duration: 1440 // Archive after 24 hours of inactivity
              })
            }
          );

          if (threadResponse.ok) {
            const threadData = await threadResponse.json();
            threadId = threadData.id;
            console.log('Thread created successfully:', threadId);
          } else {
            const threadError = await threadResponse.text();
            console.log('Failed to create thread (non-critical):', threadError);
          }
        } catch (threadErr) {
          console.log('Thread creation error (non-critical):', threadErr);
        }
      } else {
        console.log('DISCORD_BOT_TOKEN not set - skipping thread creation');
      }
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

    console.log('QOTD posted successfully:', question);

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
