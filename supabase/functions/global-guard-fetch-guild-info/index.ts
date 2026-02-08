import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type DiscordGuildFromToken = {
  id: string;
  owner: boolean;
  permissions: string;
};

type GuildInfoResponse = {
  id: string;
  name: string;
  icon: string | null;
  approximate_member_count?: number;
  approximate_presence_count?: number;
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const hasAdminPermission = (permissions: string) => {
  try {
    return (BigInt(permissions) & 0x8n) === 0x8n;
  } catch {
    return false;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { guildIds, discordAccessToken } = (await req.json().catch(() => ({}))) as {
      guildIds?: string[];
      discordAccessToken?: string;
    };

    if (!Array.isArray(guildIds) || guildIds.length === 0) {
      return json({ success: false, error: 'guildIds required' }, 400);
    }

    if (guildIds.length > 50) {
      return json({ success: false, error: 'Too many guildIds (max 50)' }, 400);
    }

    if (!discordAccessToken) {
      return json({
        success: false,
        error: 'Not authenticated',
        message: 'Please sign in with Discord again.',
        httpStatus: 401,
      });
    }

    const botToken = Deno.env.get('DISCORD_GLOBAL_GUARD_BOT_TOKEN')?.trim();
    if (!botToken) {
      console.error('[global-guard-fetch-guild-info] DISCORD_GLOBAL_GUARD_BOT_TOKEN not configured');
      return json({ success: false, error: 'Bot not configured', httpStatus: 500 }, 500);
    }

    console.log(`[global-guard-fetch-guild-info] Bot token present (length=${botToken.length})`);

    // Validate token and determine which guilds the user is allowed to query
    const guildsResp = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${discordAccessToken}` },
    });

    if (!guildsResp.ok) {
      const txt = await guildsResp.text().catch(() => '');
      console.error('[global-guard-fetch-guild-info] Failed to read user guilds', guildsResp.status, txt);
      return json({
        success: false,
        error: 'Invalid session',
        message: 'Your Discord session expired. Please sign in again.',
        httpStatus: 401,
      });
    }

    const tokenGuilds = (await guildsResp.json()) as DiscordGuildFromToken[];
    const allowedGuildIds = new Set(
      tokenGuilds.filter((g) => g.owner || hasAdminPermission(g.permissions)).map((g) => g.id)
    );

    const requested = [...new Set(guildIds)].filter((id) => typeof id === 'string' && id.length > 0);
    const allowed = requested.filter((id) => allowedGuildIds.has(id));
    const denied = requested.filter((id) => !allowedGuildIds.has(id));

    console.log(`[global-guard-fetch-guild-info] Fetching guild info for ${allowed.length} guild(s)`);

    const results = await Promise.all(
      allowed.map(async (id) => {
        try {
          const resp = await fetch(`https://discord.com/api/v10/guilds/${id}?with_counts=true`, {
            headers: { Authorization: `Bot ${botToken}` },
          });

          if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            console.warn(`[global-guard-fetch-guild-info] Failed for guild ${id}: ${resp.status}`, txt);
            return null;
          }

          const g = (await resp.json()) as GuildInfoResponse;

          return {
            guild_id: g.id,
            guild_name: g.name,
            guild_icon: g.icon,
            member_count: g.approximate_member_count ?? null,
          };
        } catch (e) {
          console.warn(`[global-guard-fetch-guild-info] Error fetching guild ${id}`, e);
          return null;
        }
      })
    );

    const guilds = results.filter(Boolean);

    return json({ success: true, guilds, deniedGuildIds: denied });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[global-guard-fetch-guild-info] Error:', error);
    return json({ success: false, error: 'Internal error', details: errorMessage }, 500);
  }
});
