# Eclipse Portal Bot — Persistent Gateway Bot

A self-hosted, always-on Discord bot that replaces the `discord-customer-bot` edge function. Connects via WebSocket gateway instead of HTTP webhooks, eliminating per-invocation costs.

## Features

- **Account linking** — `/link`, `/verify`, `/unlink`
- **Product access** — `/purchases`, `/retrieve` (signed download URLs)
- **Role syncing** — `/getrole`, `/update` (admin)
- **Store info** — `/store`, `/showcase`
- **Wallet** — `/walletbalance`
- **Global Guard** — `/globalban`, `/globalunban`, `/globalbans`
- **Modmail** — DM replies to support tickets
- **Welcome DMs** — Automatic on member join

## How Data Stays Linked

The bot uses the same Supabase database as your web app. It reads `stores.discord_guild_id` to resolve which server belongs to which store, then serves the correct products and roles.

## Setup

### 1. Install dependencies

```bash
cd eclipse-portal-bot
npm install
```

### 2. Set environment variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

### 3. Register slash commands (one-time)

```bash
npm run register
```

### 4. Start the bot

```bash
npm start
```

## Deploy to Railway

```bash
railway init
railway variables set DISCORD_CUSTOMER_BOT_TOKEN=your_token
railway variables set SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
# ... set all other env vars from .env.example
railway up
```

## Deploy to Fly.io

```bash
fly launch --no-deploy
fly secrets set DISCORD_CUSTOMER_BOT_TOKEN=your_token
fly secrets set SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
# ... set all other secrets
fly deploy
```

## After Deployment

1. In **Discord Developer Portal** → your bot application → General Information
2. **Remove** the Interactions Endpoint URL (gateway bots don't use it)
3. Ensure **Message Content Intent** and **Server Members Intent** are enabled under Bot → Privileged Gateway Intents

## Discord Bot Settings

### Required Intents (Bot → Privileged Gateway Intents)
- ✅ **Message Content Intent** — Required to read DM content (modmail)
- ✅ **Server Members Intent** — Required for welcome DMs and role management

### Bot Permissions
- Send Messages
- Embed Links
- Use External Emojis
- Manage Roles (for `/getrole` and `/update`)

## Cost Comparison

| | Edge Functions | This Bot |
|---|---|---|
| Per command | ~£0.001-0.005 | £0 |
| Monthly (est.) | £10-50+ | £0-5 |
| Cold starts | 200-500ms | None |
| Always-on | No | Yes |

## Troubleshooting

### Bot not responding to commands
1. Ensure you ran `npm run register` to register slash commands
2. Check that the bot is online (green status in Discord)
3. Remove the Interactions Endpoint URL from Discord Developer Portal

### Roles not assigning
1. Ensure the bot's role is **above** the roles it needs to assign in Server Settings → Roles
2. Check that the role IDs in env vars are correct

### DMs not working
1. Enable **Message Content Intent** in Discord Developer Portal
2. Check that the bot has the `DIRECT_MESSAGES` intent
