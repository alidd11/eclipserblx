/**
 * Per-user command cooldown manager
 * Prevents spam by enforcing a cooldown period per user per command
 */

const cooldowns = new Map(); // Map<commandName, Map<userId, expiresAt>>

// Default cooldowns per command (in seconds)
const COMMAND_COOLDOWNS = {
  daily: 86400,      // 24 hours (server-side enforced too)
  retrieve: 10,
  showcase: 30,
  profile: 5,
  purchases: 5,
  walletbalance: 5,
  balance: 5,
  leaderboard: 10,
  newdrops: 10,
  link: 10,
  verify: 10,
  store: 5,
  getrole: 15,
  update: 5,
  globalban: 5,
  globalunban: 5,
  globalbans: 5,
  help: 3,
  unlink: 30,
};

const DEFAULT_COOLDOWN = 3; // seconds

/**
 * Check if a user is on cooldown for a command.
 * Returns remaining seconds if on cooldown, or 0 if clear.
 */
export function checkCooldown(commandName, userId) {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const commandCooldowns = cooldowns.get(commandName);
  const expiresAt = commandCooldowns.get(userId);

  if (expiresAt && Date.now() < expiresAt) {
    return Math.ceil((expiresAt - Date.now()) / 1000);
  }

  return 0;
}

/**
 * Set a cooldown for a user on a command.
 */
export function setCooldown(commandName, userId) {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const seconds = COMMAND_COOLDOWNS[commandName] || DEFAULT_COOLDOWN;
  cooldowns.get(commandName).set(userId, Date.now() + seconds * 1000);
}

/**
 * Clean up expired cooldowns periodically
 */
export function cleanupCooldowns() {
  const now = Date.now();
  for (const [, userMap] of cooldowns) {
    for (const [userId, expiresAt] of userMap) {
      if (now >= expiresAt) {
        userMap.delete(userId);
      }
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupCooldowns, 5 * 60 * 1000);
