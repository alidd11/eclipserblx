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

    const { question, qotdId, category } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    // Get the community webhook URL
    const { data: webhookSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'community_discord_webhook_url')
      .maybeSingle();

    if (!webhookSetting?.value) {
      throw new Error('Community Discord webhook not configured');
    }

    // Get the saved role ID for pings
    const { data: roleSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'discord_ping_role_id')
      .maybeSingle();

    const roleId = roleSetting?.value;

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

    // Create Discord embed
    const embed = {
      title: `${emoji} Question of the Day`,
      description: `**${question}**\n\n\u200B\nShare your thoughts in the replies below! 💬`,
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

    // Send to Discord
    const webhookResponse = await fetch(webhookSetting.value, {
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

    // Try to get message ID for reactions
    let discordMessageId = null;
    
    // If webhook URL ends with ?wait=true, we get the message back
    const webhookWithWait = webhookSetting.value.includes('?') 
      ? `${webhookSetting.value}&wait=true`
      : `${webhookSetting.value}?wait=true`;

    // Send a follow-up message to add reaction prompt (optional)
    // We can also send another message for this
    
    // Update the QOTD record with discord message ID if we have it
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
      JSON.stringify({ success: true, message: 'QOTD posted to Discord' }),
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
