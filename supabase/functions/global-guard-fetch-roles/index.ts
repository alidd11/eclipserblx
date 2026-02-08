import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  managed: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { guildId } = await req.json();

    if (!guildId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Guild ID required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use Global Guard bot token
    const botToken = Deno.env.get('DISCORD_GLOBAL_GUARD_BOT_TOKEN');
    if (!botToken) {
      console.error('[global-guard-fetch-roles] DISCORD_GLOBAL_GUARD_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Bot not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[global-guard-fetch-roles] Fetching roles for guild: ${guildId}`);

    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[global-guard-fetch-roles] Discord API error: ${response.status}`, errorText);
      
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Bot not in server',
            message: 'The Global Guard bot is not in this server. Please invite it first.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch roles from Discord' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const roles: DiscordRole[] = await response.json();
    
    // Filter out @everyone role and bot-managed roles, sort by position
    const filteredRoles = roles
      .filter(r => r.name !== '@everyone' && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
      }));

    console.log(`[global-guard-fetch-roles] Found ${filteredRoles.length} roles for guild ${guildId}`);

    return new Response(
      JSON.stringify({ success: true, roles: filteredRoles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[global-guard-fetch-roles] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error', details: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
