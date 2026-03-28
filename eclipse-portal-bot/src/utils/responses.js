/**
 * Reply helpers for discord.js interactions
 */

/**
 * Send an ephemeral reply with embed(s)
 */
export async function ephemeralReply(interaction, embeds, components) {
  const payload = { embeds: Array.isArray(embeds) ? embeds : [embeds], ephemeral: true };
  if (components) payload.components = components;
  
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

/**
 * Send a public reply with an embed, and DM the user with detailed info
 */
export async function publicReplyWithDM(interaction, channelEmbed, dmEmbeds, dmComponents) {
  // Reply publicly in channel
  const replyPayload = { embeds: [channelEmbed] };
  
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(replyPayload);
  } else {
    await interaction.reply(replyPayload);
  }

  // Send DM (best-effort)
  try {
    const dmPayload = { embeds: dmEmbeds };
    if (dmComponents) dmPayload.components = dmComponents;
    await interaction.user.send(dmPayload);
  } catch (err) {
    // DMs might be disabled — non-fatal
    if (err.code !== 50007) {
      console.error('[responses] DM error:', err.message);
    }
  }
}

/**
 * Send a public reply (no DM)
 */
export async function publicReply(interaction, embeds, components) {
  const payload = { embeds: Array.isArray(embeds) ? embeds : [embeds] };
  if (components) payload.components = components;
  
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}
