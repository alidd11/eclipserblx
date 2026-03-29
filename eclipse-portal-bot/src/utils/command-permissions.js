import { supabase } from '../supabase.js';

// Cache guild command permissions (refreshed every 3 minutes)
const permissionsCache = new Map();
const CACHE_TTL = 3 * 60 * 1000;

/**
 * Check if a user has permission to run a command in a guild.
 * Returns true if:
 *  - It's the main Eclipse server (no restrictions)
 *  - No permissions are configured for this guild+command
 *  - The user has at least one of the allowed roles
 */
export async function hasCommandPermission(interaction, commandName, isMainServer) {
  // Main server has no seller restrictions
  if (isMainServer) return true;

  const guildId = interaction.guildId;
  if (!guildId) return true;

  const cacheKey = `${guildId}:${commandName}`;
  const cached = permissionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // If no allowed roles configured, everyone can use it
    if (!cached.value || cached.value.length === 0) return true;
    return checkUserRoles(interaction, cached.value);
  }

  try {
    const { data, error } = await supabase
      .from('guild_command_permissions')
      .select('allowed_role_ids')
      .eq('guild_id', guildId)
      .eq('command_name', commandName)
      .maybeSingle();

    const allowedRoles = data?.allowed_role_ids || [];
    permissionsCache.set(cacheKey, { value: allowedRoles, timestamp: Date.now() });

    if (allowedRoles.length === 0) return true;
    return checkUserRoles(interaction, allowedRoles);
  } catch (err) {
    console.error('[command-permissions] Error checking permissions:', err.message);
    // Fail open — allow command if we can't check
    return true;
  }
}

async function checkUserRoles(interaction, allowedRoleIds) {
  try {
    const member = interaction.member;
    if (!member) return true;

    // member.roles.cache contains the roles
    const userRoleIds = member.roles?.cache?.map(r => r.id) || [];
    return allowedRoleIds.some(roleId => userRoleIds.includes(roleId));
  } catch {
    return true;
  }
}

/**
 * Clear cached permissions for a guild (e.g. after config change)
 */
export function clearPermissionsCache(guildId) {
  for (const key of permissionsCache.keys()) {
    if (key.startsWith(`${guildId}:`)) {
      permissionsCache.delete(key);
    }
  }
}
