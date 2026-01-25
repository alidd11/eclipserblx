# Discord Modmail Integration Setup Guide

This guide explains how to integrate your Discord Modmail bot with the Eclipse admin dashboard.

## Overview

The integration works as follows:
1. **User DMs the bot** → Bot forwards message to Eclipse webhook → Appears in Admin Dashboard
2. **Staff replies in Dashboard** → Edge function sends DM to user via Discord API

---

## Step 1: Download the Cog File

Download the `dashboard_webhook.py` file from this folder and place it in your modmail bot's `cogs/` directory.

Your folder structure should look like:
```
modmail-bot/
├── cogs/
│   ├── modmail.py
│   ├── utility.py
│   ├── dashboard_webhook.py  ← Add this file here
│   └── ...
├── core/
│   ├── thread.py
│   └── ...
├── bot.py
└── ...
```

---

## Step 2: Install Required Dependencies

Make sure `aiohttp` is installed (it should already be in your requirements):

```bash
pip install aiohttp
```

Or add to your `requirements.txt`:
```
aiohttp>=3.8.0
```

---

## Step 3: Configure Your Bot

Add these two new config values to your bot:

### For MongoDB Configuration

Run these commands in your bot's Discord server (as an admin):

```
?config set dashboard_webhook_url https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/discord-modmail-webhook
```

```
?config set dashboard_webhook_secret YOUR_SECRET_KEY_HERE
```

**Or** add them directly in MongoDB Compass/Atlas by adding these fields to your config document:

| Field Name | Value |
|------------|-------|
| `dashboard_webhook_url` | `https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/discord-modmail-webhook` |
| `dashboard_webhook_secret` | `YOUR_SECRET_KEY_HERE` |

### For config.json (if your bot uses a local file)

Add these lines to your `config.json`:

```json
{
    "dashboard_webhook_url": "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/discord-modmail-webhook",
    "dashboard_webhook_secret": "YOUR_SECRET_KEY_HERE"
}
```

---

## Getting Your Secret Key

The secret key must match what's configured in your Cloud secrets:
- Secret name: `DISCORD_WEBHOOK_SECRET`
- Use the same value in your bot config

**To set/update the secret:**
1. Go to your project settings
2. Navigate to Settings → Cloud → Secrets
3. Find `DISCORD_WEBHOOK_SECRET` 
4. Copy its value (or set a new one if needed)
5. Use the same value in your bot's config

---

## Step 4: Load the Cog

The cog will be auto-loaded if your bot loads all cogs from the `cogs/` folder.

If you need to manually load it, add to your `bot.py`:

```python
# In your bot's setup or on_ready
await bot.load_extension("cogs.dashboard_webhook")
```

---

## Step 5: Restart Your Bot

Restart your modmail bot to apply the changes.

---

## Testing the Integration

### Test from Discord:

1. DM your bot with a test message
2. Check the Admin Dashboard at `/admin/discord-modmail`
3. The message should appear as a new ticket

### Test from Bot Console:

Use these commands (admin only):

```
?dashboard_status   - Check webhook connection status
?test_dashboard     - Send a test message to dashboard
```

### Test Staff Reply:

1. Open a ticket in the Admin Dashboard
2. Type a reply and press Enter/Send
3. User should receive a DM with your reply as an embed

---

## Troubleshooting

### Messages not appearing in dashboard

1. Check bot logs for webhook errors
2. Verify the webhook URL is correct
3. Verify the secret key matches in both places
4. Use `?dashboard_status` to check connection

### Staff replies not being delivered

1. Check if the user has DMs enabled
2. Verify `DISCORD_BOT_TOKEN` is set in Cloud secrets
3. Check edge function logs in Cloud View

### Common Errors

| Error | Solution |
|-------|----------|
| `401 Unauthorized` | Secret key mismatch - update bot config |
| `403 Forbidden` | User has DMs disabled |
| `404 Not Found` | User deleted their Discord account |
| `500 Server Error` | Check edge function logs |

---

## How It Works

### Incoming Messages (User → Dashboard)

```
User sends DM to Bot
        ↓
dashboard_webhook.py receives message
        ↓
Forwards to discord-modmail-webhook edge function
        ↓
Creates/updates ticket in database
        ↓
Sends push notification to staff
        ↓
Appears in Admin Dashboard
```

### Outgoing Replies (Dashboard → User)

```
Staff types reply in Dashboard
        ↓
Frontend calls discord-modmail-reply edge function
        ↓
Edge function uses Discord API to send DM
        ↓
User receives embed message
        ↓
Message saved to database
```

---

## Security Notes

- Always use HTTPS for webhook URLs
- Keep your webhook secret secure and unique
- The bot token is stored securely in Cloud secrets
- All staff actions require authentication

---

## Support

If you have issues:
1. Check the bot console logs
2. Check Cloud View → Edge Functions → Logs
3. Verify all secrets are configured correctly
