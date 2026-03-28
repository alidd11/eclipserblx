import { EmbedBuilder } from 'discord.js';
import { ECLIPSE_COLOR } from '../config.js';

/**
 * Get branding based on server context
 */
export function getBranding(serverContext) {
  if (serverContext.store) {
    return {
      name: serverContext.store.name,
      footer: `${serverContext.store.name} \u2022 Powered by Eclipse`,
      color: ECLIPSE_COLOR,
      icon: serverContext.store.logo_url,
    };
  }
  return {
    name: 'Eclipse Marketplace',
    footer: 'Eclipse Marketplace',
    color: ECLIPSE_COLOR,
    icon: undefined,
  };
}

/**
 * Build a Discord avatar URL from user data
 */
export function getAvatarUrl(user) {
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }
  const defaultIndex = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}
