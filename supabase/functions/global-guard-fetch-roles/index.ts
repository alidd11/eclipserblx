import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type DiscordGuildFromToken = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // Discord returns permissions as string
};

type DiscordRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { guildId, discordAccessToken } = (await req.json().catch(() => ({}))) as {
      guildId?: string;
      discordAccessToken?: string;
    };

    if (!guildId) {
      return json({ success: false, error: 'Guild ID required' }, 400);
    }

    if (!discordAccessToken) {
      return json({
        success: false,
        error: 'Not authenticated',
        message: 'Please sign in with Discord again.',
        httpStatus: 401,
      });
    }

    // Verify Discord token + make sure user is admin/owner for that guild
    const guildsResp = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${discordAccessToken}` },
    });

    if (!guildsResp.ok) {
      const txt = await guildsResp.text().catch(() => '');
      console.error('[global-guard-fetch-roles] Failed to read user guilds', guildsResp.status, txt);
      return json({
        success: false,
        error: 'Invalid session',
        message: 'Your Discord session expired. Please sign in again.',
        httpStatus: 401,
      });
    }

    const tokenGuilds = (await guildsResp.json()) as DiscordGuildFromToken[];
    const target = tokenGuilds.find((g) => g.id === guildId);

    if (!target) {
      return json({
        success: false,
        error: 'Not in server',
        message: 'Your Discord account is not in that server.',
        httpStatus: 403,
      });
    }

    const isAdminOrOwner = target.owner || hasAdminPermission(target.permissions);
    if (!isAdminOrOwner) {
      return json({
        success: false,
        error: 'Missing permissions',
        message: 'You must be the server owner or have Administrator permission to configure roles.',
        httpStatus: 403,
      });
    }

    const botToken = Deno.env.get('DISCORD_GLOBAL_GUARD_BOT_TOKEN')?.trim();
    if (!botToken) {
      console.error('[global-guard-fetch-roles] DISCORD_GLOBAL_GUARD_BOT_TOKEN not configured');
      return json({ success: false, error: 'Bot not configured', httpStatus: 500 }, 500);
    }

    console.log(`[global-guard-fetch-roles] Bot token present (length=${botToken.length})`);

    console.log(`[global-guard-fetch-roles] Fetching roles for guild ${guildId} (bot-first, user-fallback)`);

    const fetchRoles = async (authHeader: string) => {
      return await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: authHeader },
      });
    };

    // 1) Try bot token first (preferred)
    let rolesResponse = await fetchRoles(`Bot ${botToken}`);

    // 2) If bot cannot access (missing access / missing perms), try the user's token as fallback
    if (!rolesResponse.ok && (rolesResponse.status === 403 || rolesResponse.status === 404)) {
      console.warn(
        `[global-guard-fetch-roles] Bot could not fetch roles (${rolesResponse.status}). Trying user token fallback...`
      );
      rolesResponse = await fetchRoles(`Bearer ${discordAccessToken}`);
    }

    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text().catch(() => '');
      console.error('[global-guard-fetch-roles] Discord API error', rolesResponse.status, errorText);

      const message =
        rolesResponse.status === 403
          ? 'Missing access to roles. Ensure the bot has “Manage Roles”, or your account has permission to view roles.'
          : 'Failed to fetch roles from Discord.';

      return json({
        success: false,
        error: 'Failed to fetch roles',
        message,
        httpStatus: rolesResponse.status,
      });
    }

    const roles = (await rolesResponse.json()) as DiscordRole[];

    const filteredRoles = roles
      .filter((r) => r.name !== '@everyone' && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
      }));

    console.log(`[global-guard-fetch-roles] Returning ${filteredRoles.length} roles for guild ${guildId}`);

    return json({ success: true, roles: filteredRoles });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[global-guard-fetch-roles] Error:', error);
    return json({ success: false, error: 'Internal error', details: errorMessage }, 500);
  }
});
