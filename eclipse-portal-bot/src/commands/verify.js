import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { supabase } from '../supabase.js';

export async function handleVerify(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const discordUsername = interaction.user.globalName || interaction.user.username;
  const avatarUrl = getAvatarUrl(interaction.user);
  const code = interaction.options.getString('code')?.toUpperCase().trim();

  if (!code) {
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Please provide a verification code. Check your DMs for help.`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444,
      title: '❌ Code Required',
      description: 'Please provide your link code.',
      fields: [
        { name: 'Usage', value: '`/verify code:YOUR_CODE`' },
        { name: 'Get a Code', value: 'Generate one from your [Eclipse account settings](https://eclipserblx.com/account)' },
      ],
      footer: { text: branding.footer },
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  // Find valid code
  const { data: linkCode, error: codeError } = await supabase
    .from('discord_link_codes')
    .select('id, user_id, expires_at, verified_at')
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .is('verified_at', null)
    .maybeSingle();

  if (codeError || !linkCode) {
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ That code is invalid or expired. Check your DMs for help.`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444,
      title: '❌ Invalid or Expired Code',
      description: "This code doesn't exist or has expired.",
      fields: [{ name: 'What to do', value: 'Generate a new code from your [Eclipse account settings](https://eclipserblx.com/account)' }],
      footer: { text: branding.footer },
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  // Update code and profile in parallel
  await Promise.all([
    supabase.from('discord_link_codes').update({
      discord_user_id: discordUserId,
      discord_username: discordUsername,
      verified_at: new Date().toISOString(),
    }).eq('id', linkCode.id),
    supabase.from('profiles').update({
      discord_id: discordUserId,
      discord_username: discordUsername,
    }).eq('user_id', linkCode.user_id),
  ]);

  const channelEmbed = {
    color: 0x22c55e,
    description: `<@${discordUserId}>\n🎉 Your account has been linked! Check your DMs for details.`,
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
  };
  const dmEmbed = {
    color: 0x22c55e,
    title: '✅ Account Linked Successfully!',
    description: 'Your Discord account is now connected to Eclipse.',
    thumbnail: { url: avatarUrl },
    fields: [{
      name: 'Available Commands',
      value: '• `/profile` - View your account\n• `/purchases` - See your orders\n• `/retrieve` - Get your files\n• `/getrole` - Sync your roles',
    }],
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
}
