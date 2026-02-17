import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_API = 'https://discord.com/api/v10';
const CHANNEL_ID = '1461353045945221265';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('DISCORD_CUSTOMER_BOT_TOKEN');
    if (!botToken) {
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First, get the channel to find the guild_id
    const channelRes = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}`, {
      headers: { 'Authorization': `Bot ${botToken}` },
    });

    if (!channelRes.ok) {
      const err = await channelRes.text();
      return new Response(JSON.stringify({ error: 'Failed to fetch channel', details: err }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const channel = await channelRes.json();
    const guildId = channel.guild_id;

    // @everyone role ID is the same as the guild ID
    const everyoneRoleId = guildId;

    // Set permission overwrite for @everyone:
    // Deny SEND_MESSAGES (1 << 11 = 2048)
    // Allow VIEW_CHANNEL (1 << 10 = 1024) so they can still see the channel
    const overwrite = {
      id: everyoneRoleId,
      type: 0, // role type
      allow: '1024',  // VIEW_CHANNEL
      deny: '2048',   // SEND_MESSAGES
    };

    // Get existing overwrites and merge
    const existingOverwrites = channel.permission_overwrites || [];
    const filteredOverwrites = existingOverwrites.filter((o: any) => o.id !== everyoneRoleId);
    filteredOverwrites.push(overwrite);

    // Update channel permissions
    const updateRes = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        permission_overwrites: filteredOverwrites,
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return new Response(JSON.stringify({ error: 'Failed to update permissions', details: err }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await updateRes.json();
    console.log(`[lock-channel] Successfully locked channel ${CHANNEL_ID} - slash commands only`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Channel ${CHANNEL_ID} locked: @everyone can view but not send messages. Slash commands still work.`,
      channel_name: result.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[lock-channel] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
