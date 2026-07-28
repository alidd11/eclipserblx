/**
 * One-off script to register slash commands with Discord.
 * Run: node src/register-commands.js
 *
 * This registers commands GLOBALLY (all guilds where the bot is installed).
 */
import 'dotenv/config';
import { config } from './config.js';

const DISCORD_API = 'https://discord.com/api/v10';

const commands = [
  { name: 'link', description: 'Check if your Discord is linked to your Eclipse account' },
  {
    name: 'verify', description: 'Link your Discord using a verification code',
    options: [{ name: 'code', description: 'Your verification code from Eclipse', type: 3, required: true }],
  },
  { name: 'profile', description: 'View your Eclipse profile and stats' },
  { name: 'purchases', description: 'View your recent purchases' },
  {
    name: 'retrieve', description: 'Get a download link for a purchased product',
    options: [{ name: 'product', description: 'Product name to download', type: 3, required: false }],
  },
  { name: 'getrole', description: 'Sync your Discord roles based on your Eclipse account' },
  { name: 'store', description: "View this server's store information" },
  { name: 'unlink', description: 'Disconnect your Discord from your Eclipse account' },
  { name: 'showcase', description: 'Showcase your store or product' },
  { name: 'walletbalance', description: 'Check your Eclipse wallet balance (sent via DM)' },
  { name: 'help', description: 'View all available bot commands' },
  {
    name: 'update', description: 'Admin: sync Eclipse roles for a user',
    options: [{ name: 'user', description: 'The user to sync roles for', type: 6, required: true }],
  },
  {
    name: 'globalban', description: 'Ban a user across all your servers (Global Guard)',
    options: [
      { name: 'user', description: 'Discord user ID or @mention', type: 3, required: true },
      { name: 'reason', description: 'Reason for the ban', type: 3, required: false },
      {
        name: 'duration', description: 'Ban duration (leave empty for permanent)', type: 3, required: false,
        choices: [
          { name: '1 Hour', value: '1h' }, { name: '12 Hours', value: '12h' },
          { name: '1 Day', value: '1d' }, { name: '7 Days', value: '7d' },
          { name: '30 Days', value: '30d' }, { name: '90 Days', value: '90d' },
        ],
      },
    ],
  },
  {
    name: 'globalunban', description: 'Remove a global ban from a user',
    options: [{ name: 'user', description: 'Discord user ID or @mention', type: 3, required: true }],
  },
  { name: 'globalbans', description: 'View your active global bans' },
  // New commands
  { name: 'daily', description: 'Claim your daily XP reward (streak bonuses!)' },
  { name: 'leaderboard', description: 'View the Eclipse XP leaderboard' },
  { name: 'balance', description: 'View your Eclipse credits and XP in one place' },
  { name: 'newdrops', description: 'View the latest product drops on Eclipse' },
  // Moderation + utility commands (handlers exist in interaction.js; these were
  // previously unregistered, so they never appeared in Discord).
  {
    name: 'ban', description: 'Ban a member from this server',
    options: [
      { name: 'user', description: 'The member to ban', type: 6, required: true },
      { name: 'reason', description: 'Reason for the ban', type: 3, required: false },
      { name: 'delete_messages', description: "Days of the user's messages to delete (0-7)", type: 4, required: false },
    ],
  },
  {
    name: 'kick', description: 'Kick a member from this server',
    options: [
      { name: 'user', description: 'The member to kick', type: 6, required: true },
      { name: 'reason', description: 'Reason for the kick', type: 3, required: false },
    ],
  },
  {
    name: 'timeout', description: 'Timeout a member for a set duration',
    options: [
      { name: 'user', description: 'The member to timeout', type: 6, required: true },
      {
        name: 'duration', description: 'How long to timeout for', type: 3, required: true,
        choices: [
          { name: '60 seconds', value: '60s' }, { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' }, { name: '30 minutes', value: '30m' },
          { name: '1 hour', value: '1h' }, { name: '6 hours', value: '6h' },
          { name: '12 hours', value: '12h' }, { name: '1 day', value: '1d' },
          { name: '7 days', value: '7d' }, { name: '28 days', value: '28d' },
        ],
      },
      { name: 'reason', description: 'Reason for the timeout', type: 3, required: false },
    ],
  },
  {
    name: 'unban', description: 'Unban a user by their Discord ID',
    options: [
      { name: 'user_id', description: 'The Discord user ID to unban', type: 3, required: true },
      { name: 'reason', description: 'Reason for the unban', type: 3, required: false },
    ],
  },
  {
    name: 'modlog', description: 'View recent moderation actions in this server',
    options: [{ name: 'count', description: 'How many actions to show (max 25)', type: 4, required: false }],
  },
  {
    name: 'afk', description: 'Set your AFK status',
    options: [{ name: 'reason', description: 'Your AFK reason', type: 3, required: false }],
  },
];

async function registerCommands() {
  // Get bot application ID
  const meRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bot ${config.botToken}` },
  });
  const me = await meRes.json();
  const appId = me.id;

  console.log(`Registering ${commands.length} commands for application ${appId}...`);

  const res = await fetch(`${DISCORD_API}/applications/${appId}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${config.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Failed to register commands:', res.status, error);
    process.exit(1);
  }

  const registered = await res.json();
  console.log(`\u2705 Successfully registered ${registered.length} commands globally!`);
  registered.forEach(cmd => console.log(`  /${cmd.name} \u2014 ${cmd.description}`));
}

registerCommands().catch(console.error);
