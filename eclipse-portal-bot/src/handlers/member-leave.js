import { sendOrionWebhook } from '../utils/orion-webhook.js';

export async function handleMemberLeave(member) {
  // Ignore bot leaves (mirrors join handler behavior)
  if (member.user?.bot) return;

  console.log(`[LEAVE] ${member.user?.tag || member.id} left ${member.guild.name} (${member.guild.id})`);

  // Fire-and-forget Orion notification. Never blocks or throws.
  sendOrionWebhook('member_leave', {
    guild: member.guild.name,
    member_id: String(member.id),
    member_count_now: member.guild.memberCount ?? 0,
  });
}
