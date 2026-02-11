

# Seller Discord Bot Integration -- Eclipse Portal Bot

## Overview
Allow sellers to invite the Eclipse Portal Bot (App ID: `1466778545039741072`) to their own Discord server. Once added, their customers can use commands like `/retrieve`, `/link`, `/purchases`, `/profile`, etc., scoped to that seller's products. Sellers can also send rich product drop embeds to their server channels using the bot.

## Current State
- The Eclipse Portal Bot already supports multi-server via `getServerContext()` -- it looks up `stores.discord_guild_id` to identify seller servers and scopes commands accordingly
- The `stores` table already has a `discord_guild_id` column
- `store_credentials` has `discord_guild_id` too (used for role assignment)
- The `send-product-drop-embed` edge function uses `DISCORD_CUSTOMER_BOT_TOKEN` to send messages
- Sellers currently only have webhook-based announcements (no bot-powered embeds)

## What Changes

### 1. Seller Discord Page -- "Add Eclipse Portal Bot" Section
Add a prominent card at the top of `/seller/discord` that:
- Shows an "Add to Server" button generating a Discord OAuth2 invite URL for the Eclipse Portal Bot (client ID `1466778545039741072`) with permissions for sending messages, embedding links, and managing roles
- On successful addition, saves the `discord_guild_id` to both `stores` and `store_credentials` tables
- Displays the connected server name when already linked
- Lists what commands become available: `/retrieve`, `/link`, `/purchases`, `/profile`, `/store`, `/getrole`

### 2. New Edge Function: `invite-portal-bot`
A simple function that:
- Takes the seller's `store_id` and generates an OAuth2 invite URL for the Eclipse Portal Bot
- Uses a state parameter (like `activate-bot-license` does) to securely pass the store ID
- On OAuth callback, saves the `guild_id` to `stores.discord_guild_id` and `store_credentials.discord_guild_id`
- Returns a success page redirecting back to the seller dashboard

### 3. Seller Embed Builder using the Portal Bot
Replace the current webhook-based `ScheduledAnnouncementCard` with a bot-powered embed sender:
- Seller enters a channel ID (the channel in their server where they want to post)
- Builds the embed (title, description, color, optional image, optional fields)
- Sends via `send-product-drop-embed` edge function (which already uses the Portal Bot token)
- Option to include role pings using their configured role IDs
- Keep the webhook fallback for sellers who haven't added the bot yet

### 4. Update SellerSettingsNotifications
- Replace the "Bot Token" / "Guild ID" / "Role ID" section with a simpler flow
- Remove the need for sellers to create their own bot application
- The guild ID gets auto-populated when they add the Eclipse Portal Bot
- Keep the "Customer Role ID" field so sellers can configure which role to assign on purchase
- Keep webhook URL as a fallback option

---

## Technical Details

### New Edge Function: `invite-portal-bot`

| Detail | Value |
|--------|-------|
| Path | `supabase/functions/invite-portal-bot/index.ts` |
| Method | POST (generate URL), GET (OAuth callback) |
| Auth | JWT verified for POST, state-verified for GET |
| Bot App ID | `1466778545039741072` (hardcoded, not from env) |
| Permissions | `2147534848` (Send Messages, Embed Links, Use Slash Commands, Manage Roles) |
| Scopes | `bot`, `applications.commands` |

The callback saves `guild_id` to both `stores.discord_guild_id` and `store_credentials.discord_guild_id`, then redirects to `/seller/discord?connected=true`.

### New Component: `AddPortalBotCard`
- Shows bot status (connected server name or "Not Connected")
- "Add to Server" button that calls `invite-portal-bot`
- Lists available commands with descriptions
- If already connected, shows a "Disconnect" option that clears `discord_guild_id`

### Updated `ScheduledAnnouncementCard`
- Detects if Portal Bot is connected (has `discord_guild_id` on store)
- If yes: sends via `send-product-drop-embed` (bot-powered, richer features)
- If no: falls back to webhook-based sending (current behavior)
- Adds channel ID input field for bot-powered sends
- Adds role ping toggle

### File Changes

| File | Action |
|------|--------|
| `supabase/functions/invite-portal-bot/index.ts` | Create -- OAuth flow for adding bot to seller server |
| `src/components/seller/AddPortalBotCard.tsx` | Create -- Bot invite and status card |
| `src/components/seller/ScheduledAnnouncementCard.tsx` | Update -- Add bot-powered sending path with channel ID |
| `src/pages/seller/SellerDiscord.tsx` | Update -- Add Portal Bot card, reorder sections |
| `src/pages/seller/SellerSettingsNotifications.tsx` | Update -- Simplify bot section, auto-populate guild ID |

### No Database Migration Needed
Both `stores.discord_guild_id` and `store_credentials.discord_guild_id` columns already exist.

