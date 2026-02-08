import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get marketplace webhook URL from settings
    const { data: settings } = await supabaseClient
      .from('settings')
      .select('key, value')
      .eq('key', 'marketplace_discord_webhook_url')
      .single();

    if (!settings?.value) {
      return new Response(
        JSON.stringify({ success: false, error: 'No marketplace webhook configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const webhookUrl = settings.value.replace(/^"|"$/g, '');

    // Build the announcement embed
    const embeds = [
      {
        title: '🛡️ Introducing Global Guard',
        description: '**Cross-Server Ban Management for Discord**\n\nKeep your communities safe with synchronized bans across all your Discord servers. Share ban lists, coordinate moderation, and protect your servers from bad actors.',
        color: 0x3B82F6, // Blue color matching Global Guard branding
        fields: [
          { name: '💰 Monthly', value: '£2.99/mo', inline: true },
          { name: '💎 Annual', value: '£24.99/yr\n(Save 30%!)', inline: true },
          { name: '🔗 Get Started', value: '[Subscribe Now](https://eclipserblx.com/guard)', inline: false },
        ],
        thumbnail: { url: 'https://eclipserblx.com/logo.png' },
        footer: { text: 'Eclipse Marketplace • New Subscription Service' },
        timestamp: new Date().toISOString(),
      },
      {
        title: 'Premium Features',
        color: 0x3B82F6,
        fields: [
          { name: '🌐 Unlimited Servers', value: 'Connect as many servers as you need', inline: false },
          { name: '⚡ Priority Sync', value: '100ms sync speed for instant ban propagation', inline: false },
          { name: '📋 Ban Templates', value: 'Create reusable ban templates for common violations', inline: false },
          { name: '📊 Advanced Analytics', value: 'Track moderation activity across all servers', inline: false },
          { name: '🎫 Priority Support', value: 'Get help fast when you need it', inline: false },
        ],
      },
    ];

    // Send to Discord
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('[send-global-guard-announcement] Discord webhook failed:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Discord webhook failed', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[send-global-guard-announcement] Announcement sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Global Guard announcement sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-global-guard-announcement] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error', details: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
