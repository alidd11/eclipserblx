# Eclipse Support Bot

A persistent Discord bot that allows customers to reply to modmail tickets directly via DM, without needing the `/reply` command.

## How It Works

1. Customer opens a ticket via `/support` slash command
2. Staff responds via the admin dashboard
3. Customer receives a DM with the response
4. **Customer can now reply directly to the DM** (this bot handles it)
5. The reply is added to the ticket and staff are notified

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_CUSTOMER_BOT_TOKEN` | Your Discord bot token |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for database access) |
| `DISCORD_WEBHOOK_URL` | (Optional) Webhook for staff notifications |

## Deploy to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect this folder as a GitHub repo or use Railway CLI
3. Add the environment variables above
4. Deploy!

### Quick Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add environment variables
railway variables set DISCORD_CUSTOMER_BOT_TOKEN=your_token_here
railway variables set SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
railway variables set DISCORD_WEBHOOK_URL=your_webhook_url

# Deploy
railway up
```

## Deploy to Fly.io

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
2. Create a `fly.toml` file (see below)
3. Run `fly deploy`

### fly.toml

```toml
app = "eclipse-support-bot"
primary_region = "lhr"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"
```

Then set secrets:

```bash
fly secrets set DISCORD_CUSTOMER_BOT_TOKEN=your_token_here
fly secrets set SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
fly secrets set DISCORD_WEBHOOK_URL=your_webhook_url
```

## Discord Bot Settings

Make sure your Discord bot has these settings in the [Discord Developer Portal](https://discord.com/developers/applications):

### Required Intents (Bot → Privileged Gateway Intents)
- ✅ **Message Content Intent** - Required to read DM content
- ✅ **Direct Messages** - Required to receive DMs

### Bot Permissions
The bot only needs basic permissions since it just reads/sends DMs.

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables
export DISCORD_CUSTOMER_BOT_TOKEN=your_token
export SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_key
export DISCORD_WEBHOOK_URL=your_webhook

# Run
npm start
```

## Troubleshooting

### Bot not receiving DMs
1. Ensure **Message Content Intent** is enabled in Discord Developer Portal
2. Check that the bot is online (green status)
3. Verify the bot token is correct

### Messages not saving
1. Check Supabase service role key is valid
2. Verify the `discord_modmail_tickets` and `discord_modmail_messages` tables exist
3. Check Railway/Fly.io logs for errors

### Staff not getting notified
1. Verify `DISCORD_WEBHOOK_URL` is set correctly
2. Check that the webhook is still active in Discord
