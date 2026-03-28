

# Persistent Eclipse Portal Bot — Deployable Node.js Application

## What this is
A self-hosted, always-on Node.js bot that replaces the `discord-customer-bot` edge function (3,281 lines). It connects to Discord via WebSocket gateway instead of HTTP webhooks, eliminating per-invocation costs. All data stays linked to your platform via your existing database.

## How data stays linked
The bot uses the same database connection (via Supabase service role key) as the current edge functions. It reads/writes the same tables (`profiles`, `orders`, `order_items`, `products`, `stores`, `store_credentials`, etc.) so everything stays in sync with your web app. When a customer runs `/retrieve` in a seller's Discord, the bot looks up the guild → finds the linked store → checks the user's purchases → serves the file. No data duplication needed.

## Files to create

All files go in `eclipse-portal-bot/` at the project root:

```text
eclipse-portal-bot/
├── package.json              — discord.js + supabase-js dependencies
├── Dockerfile                — For Railway/Fly.io/VPS deployment
├── fly.toml                  — Fly.io config (optional)
├── .env.example              — All required env vars documented
├── README.md                 — Setup & deployment guide
└── src/
    ├── index.js              — Entry point: client setup, event routing, health check server
    ├── config.js             — Env var validation + constants
    ├── supabase.js           — Supabase client init (service role)
    ├── utils/
    │   ├── embeds.js         — Shared embed builders, branding helper
    │   ├── responses.js      — Ephemeral/public reply helpers
    │   └── server-context.js — Guild → store resolution (same logic as edge fn)
    ├── commands/
    │   ├── link.js           — /link command
    │   ├── verify.js         — /verify command
    │   ├── profile.js        — /profile command
    │   ├── purchases.js      — /purchases command
    │   ├── retrieve.js       — /retrieve command (signed download URLs)
    │   ├── getrole.js        — /getrole command (role sync)
    │   ├── store.js          — /store command
    │   ├── unlink.js         — /unlink command
    │   ├── showcase.js       — /showcase command + modal handler
    │   ├── walletbalance.js  — /walletbalance command
    │   ├── help.js           — /help command (paginated)
    │   ├── update.js         — /update command (admin role sync)
    │   ├── globalban.js      — /globalban command
    │   ├── globalunban.js    — /globalunban command
    │   └── globalbans.js     — /globalbans command
    ├── handlers/
    │   ├── interaction.js    — Routes interactionCreate to command files
    │   ├── dm.js             — Modmail DM handler (merged from discord-support-bot)
    │   └── member-join.js    — Welcome DM on guildMemberAdd
    └── register-commands.js  — One-off script to register slash commands with Discord API
```

## Key design decisions

1. **Gateway-based** — Uses discord.js `interactionCreate` event via WebSocket. No HTTP signature verification needed. Discord sends interactions directly through the gateway.

2. **Same bot token** — Uses `DISCORD_CUSTOMER_BOT_TOKEN` (the Eclipse Portal Bot). Same bot, different hosting.

3. **Same database** — Connects to your existing database with `SUPABASE_SERVICE_ROLE_KEY`. Reads the same `stores.discord_guild_id` to resolve which server belongs to which store.

4. **Merges modmail** — The DM handler from `discord-support-bot/` is included, so you only need one running bot process.

5. **Health check server** — Runs a tiny HTTP server on port 8080 for Railway/Fly.io liveness checks.

6. **Edge functions remain** — `invite-portal-bot` (OAuth callback) stays as an edge function since it needs to be an HTTP endpoint for Discord's OAuth redirect. Notification webhooks also stay.

## Environment variables needed

```
DISCORD_CUSTOMER_BOT_TOKEN        — Bot token (already have this)
SUPABASE_URL                      — Database URL
SUPABASE_SERVICE_ROLE_KEY         — Service role key
DISCORD_GUILD_ID                  — Main Eclipse server ID
DISCORD_CUSTOMER_ROLE_ID          — Role IDs for auto-assignment
DISCORD_LOYAL_CUSTOMER_ROLE_ID
DISCORD_STORE_CREATOR_ROLE_ID
DISCORD_ROLE_ID                   — Eclipse+ role
DISCORD_VERIFIED_SELLER_ROLE_ID
DISCORD_WEBHOOK_URL               — Staff modmail notifications
SITE_URL                          — https://eclipserblx.com
```

## After deployment

1. Deploy to Railway ($5/mo) or Fly.io (free tier available)
2. Set all env vars on the hosting platform
3. Run `node src/register-commands.js` once to register slash commands
4. In Discord Developer Portal → remove the Interactions Endpoint URL (gateway bots don't use it)
5. The existing edge function can remain as a fallback or be disabled

## Cost comparison

| | Edge Functions | Persistent Bot |
|---|---|---|
| Per command | ~$0.001-0.005 | $0 |
| Monthly (est.) | $10-50+ | $0-5 |
| Cold starts | 200-500ms | None |

