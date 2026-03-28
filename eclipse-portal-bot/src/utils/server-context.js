import { supabase } from '../supabase.js';
import { config } from '../config.js';

/**
 * Determine server context — main Eclipse server or a linked store server
 */
export async function getServerContext(guildId) {
  if (!guildId) {
    return { guildId: config.mainGuildId, isMainServer: true };
  }

  if (guildId === config.mainGuildId) {
    return { guildId, isMainServer: true };
  }

  // Check if this guild is associated with a store
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, name, slug, logo_url')
    .eq('discord_guild_id', guildId)
    .eq('is_active', true)
    .maybeSingle();

  if (store && !error) {
    return { guildId, isMainServer: false, store };
  }

  return { guildId, isMainServer: false };
}

/**
 * Get linked Eclipse account from Discord ID
 */
export async function getLinkedAccount(discordUserId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, username, customer_id, avatar_url, discord_id, email')
    .eq('discord_id', discordUserId)
    .maybeSingle();

  if (error) {
    console.error('[server-context] Profile lookup error:', error);
    return null;
  }

  // If profile found but no email, try auth.users
  if (profile && !profile.email) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
    if (authUser?.user?.email) {
      profile.email = authUser.user.email;
    }
  }

  return profile;
}
