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

    const { question, qotdId, category, staffUserId, staffDisplayName } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    // Get the community webhook URL and role IDs
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['community_discord_webhook_url', 'qotd_discord_role_id', 'discord_ping_role_id']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : s.value;
    });

    if (!settingsMap.community_discord_webhook_url) {
      throw new Error('Community Discord webhook not configured');
    }

    // Use QOTD-specific role, fall back to default role
    const roleId = settingsMap.qotd_discord_role_id || settingsMap.discord_ping_role_id;

    // Category emoji mapping
    const categoryEmojis: Record<string, string> = {
      gaming: '🎮',
      roleplay: '🎭',
      community: '👥',
      funHypothetical: '🤔',
      creative: '🎨',
      custom: '💬'
    };

    const emoji = categoryEmojis[category] || '❓';

    // Build the sent by text
    const sentByText = staffDisplayName ? `\n\n*Sent by ${staffDisplayName}*` : '';

    // Create Discord embed with Eclipse branding
    const embed = {
      title: `${emoji} Question of the Day`,
      description: `**${question}**\n\n\u200B\nShare your thoughts in the replies below! 💬${sentByText}`,
      color: 0x5865F2, // Discord blurple
      footer: {
        text: 'Eclipse Marketplace • QOTD'
      },
      timestamp: new Date().toISOString(),
      image: {
        url: 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/eclipse-discord-banner.png'
      }
    };

    // Build message content with optional role ping
    let content = '';
    if (roleId) {
      content = `<@&${roleId}>`;
    }

    // Use ?wait=true to get the message ID back for thread creation
    const webhookWithWait = settingsMap.community_discord_webhook_url.includes('?') 
      ? `${settingsMap.community_discord_webhook_url}&wait=true`
      : `${settingsMap.community_discord_webhook_url}?wait=true`;

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
