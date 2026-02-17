import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, username } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[WELCOME] Received join webhook for ${username || user_id}, waiting 1 minute...`);

    // Wait 1 minute before sending
    await new Promise((resolve) => setTimeout(resolve, 60_000));

    const CHANNEL_ID = '1461353041310781531';
    const BOT_TOKEN = Deno.env.get('DISCORD_CUSTOMER_BOT_TOKEN');

    if (!BOT_TOKEN) {
      throw new Error('DISCORD_CUSTOMER_BOT_TOKEN not configured');
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `👋 Welcome to the server, <@${user_id}>! We're glad to have you here!`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WELCOME] Discord API error: ${response.status} - ${errorText}`);
      throw new Error(`Discord API error: ${response.status}`);
    }

    console.log(`[WELCOME] Successfully sent welcome for ${username || user_id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[WELCOME] Error:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
