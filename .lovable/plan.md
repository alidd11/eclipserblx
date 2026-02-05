
# Bot-Based Discord Messaging Implementation Plan

## Overview

This plan transitions all Discord webhook-based messaging to use the Discord Bot API directly. Instead of storing webhook URLs, the system will use channel IDs and the existing `DISCORD_BOT_TOKEN` to post messages via `https://discord.com/api/v10/channels/{channelId}/messages`.

---

## Current State Analysis

### Existing Webhook Functions (12 total)
| Function | Webhook Setting Key | Purpose |
|----------|-------------------|---------|
| `send-order-discord-notification` | `discord_webhook_url` | Order notifications |
| `send-review-discord-notification` | `review_discord_webhook_url` | Review alerts |
| `send-discord-qotd` | `qotd_discord_webhook_url` | Question of the day |
| `send-discord-poll` | `polls_discord_webhook_url` | Community polls |
| `send-community-announcement` | `community_discord_webhook_url` | General announcements |
| `send-affiliate-announcement` | `affiliate_discord_webhook_url` | Affiliate programme |
| `send-eclipse-plus-announcement` | `eclipse_plus_discord_webhook_url` | Membership promo |
| `send-marketplace-announcement` | `marketplace_discord_webhook_url` | Marketplace promo |
| `send-product-drop-webhook` | `product_drops_discord_webhook_url` | Product drops |
| `send-product-drop-webhook` | `early_product_drops_discord_webhook_url` | Early access drops |
| `send-promotion-discord-webhook` | `promotions_discord_webhook_url` | Discount codes |
| `send-advertisement-discord-webhook` | `advertisements_discord_webhook_url` | Paid ads |

### Existing Infrastructure
- `DISCORD_BOT_TOKEN` secret already configured
- `DISCORD_GUILD_ID` secret already configured
- Bot already used for reactions, threads, and role assignment

---

## Implementation Strategy

### Phase 1: Create Shared Bot Messaging Utility

Create a reusable utility file that all edge functions can import:

```text
supabase/functions/_shared/discord-bot.ts
```

This utility will provide:
- `sendBotMessage(channelId, payload)` - Post embeds to a channel
- `addReaction(channelId, messageId, emoji)` - Add reactions
- `createThread(channelId, messageId, name)` - Create discussion threads
- Error handling with proper rate limit awareness

### Phase 2: Add Channel ID Settings

Add new settings keys to store channel IDs (alongside existing webhooks for backwards compatibility):

| New Setting Key | Replaces |
|----------------|----------|
| `orders_discord_channel_id` | `discord_webhook_url` |
| `reviews_discord_channel_id` | `review_discord_webhook_url` |
| `qotd_discord_channel_id` | `qotd_discord_webhook_url` |
| `polls_discord_channel_id` | `polls_discord_webhook_url` |
| `community_discord_channel_id` | `community_discord_webhook_url` |
| `affiliate_discord_channel_id` | `affiliate_discord_webhook_url` |
| `eclipse_plus_discord_channel_id` | `eclipse_plus_discord_webhook_url` |
| `marketplace_discord_channel_id` | `marketplace_discord_webhook_url` |
| `product_drops_discord_channel_id` | `product_drops_discord_webhook_url` |
| `early_product_drops_discord_channel_id` | `early_product_drops_discord_webhook_url` |
| `promotions_discord_channel_id` | `promotions_discord_webhook_url` |
| `advertisements_discord_channel_id` | `advertisements_discord_webhook_url` |

### Phase 3: Update Edge Functions

Each function will be updated to:
1. Check for channel ID setting first (new bot-based method)
2. Fall back to webhook URL if no channel ID configured (backwards compatible)
3. Use the shared bot utility for posting when channel ID is present

**Update order** (grouped by complexity):
1. Simple announcement functions (no reactions/threads):
   - `send-community-announcement`
   - `send-affiliate-announcement`
   - `send-eclipse-plus-announcement`
   - `send-marketplace-announcement`
   - `send-promotion-discord-webhook`
   - `send-advertisement-discord-webhook`

2. Notification functions (with reactions):
   - `send-order-discord-notification`
   - `send-review-discord-notification`
   - `send-product-drop-webhook`

3. Complex functions (reactions + threads):
   - `send-discord-qotd` (creates discussion thread)
   - `send-discord-poll` (multiple reactions)

### Phase 4: Update Admin UI

Update `src/pages/admin/DiscordSettings.tsx` to:
1. Add channel ID input fields alongside webhook URLs
2. Add "Use Bot" toggle for each notification type
3. Include helper text explaining how to get channel IDs
4. Update test buttons to work with both methods

---

## Technical Details

### Shared Bot Utility Structure

```typescript
// supabase/functions/_shared/discord-bot.ts

interface BotMessagePayload {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: any[];
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  channelId?: string;
  error?: string;
}

export async function sendBotMessage(
  channelId: string,
  payload: BotMessagePayload
): Promise<SendMessageResult>

export async function addReaction(
  channelId: string,
  messageId: string,
  emoji: string
): Promise<boolean>

export async function createThread(
  channelId: string,
  messageId: string,
  name: string,
  autoArchiveDuration?: number
): Promise<{ threadId: string } | null>
```

### Edge Function Update Pattern

Each function will follow this pattern:

```typescript
// Check for channel ID first (bot method)
const channelId = settingsMap["xxx_discord_channel_id"];
const webhookUrl = settingsMap["xxx_discord_webhook_url"];

let messageResult;

if (channelId) {
  // Use bot API
  messageResult = await sendBotMessage(channelId, { content, embeds });
} else if (webhookUrl) {
  // Fall back to webhook
  const response = await fetch(webhookUrl, { ... });
  messageResult = await response.json();
} else {
  throw new Error("No channel ID or webhook configured");
}
```

### UI Component Addition

Add to the `WebhookConfig` interface:

```typescript
interface WebhookConfig {
  // ... existing fields
  channelIdKey?: keyof DiscordSettings;
  channelIdLabel?: string;
  supportsBot?: boolean;
}
```

New input field pattern:

```text
+------------------------------------------+
| Order Notifications                       |
| Notify when orders are placed            |
+------------------------------------------+
| Channel ID (Bot)                         |
| [________________________] [?]           |
|                                          |
| -- OR --                                 |
|                                          |
| Webhook URL (Legacy)                     |
| [________________________]               |
|                                          |
| [Test]                                   |
+------------------------------------------+
```

---

## File Changes Summary

### New Files
1. `supabase/functions/_shared/discord-bot.ts` - Shared bot messaging utility

### Modified Edge Functions (12 files)
1. `supabase/functions/send-order-discord-notification/index.ts`
2. `supabase/functions/send-review-discord-notification/index.ts`
3. `supabase/functions/send-discord-qotd/index.ts`
4. `supabase/functions/send-discord-poll/index.ts`
5. `supabase/functions/send-community-announcement/index.ts`
6. `supabase/functions/send-affiliate-announcement/index.ts`
7. `supabase/functions/send-eclipse-plus-announcement/index.ts`
8. `supabase/functions/send-marketplace-announcement/index.ts`
9. `supabase/functions/send-product-drop-webhook/index.ts`
10. `supabase/functions/send-promotion-discord-webhook/index.ts`
11. `supabase/functions/send-advertisement-discord-webhook/index.ts`
12. `supabase/functions/_shared/rateLimit.ts` (add Discord rate limit helper)

### Modified Frontend Files
1. `src/pages/admin/DiscordSettings.tsx` - Add channel ID inputs and bot toggle

---

## Migration Path

1. **Zero downtime**: Both methods work simultaneously
2. **Gradual migration**: Add channel IDs one at a time
3. **No webhook deletion**: Existing webhooks continue to work
4. **Optional adoption**: Staff can migrate at their own pace

---

## Benefits After Implementation

| Feature | Before (Webhooks) | After (Bot API) |
|---------|-------------------|-----------------|
| Configuration | 12+ webhook URLs | 12 channel IDs |
| Identity | Different per webhook | Single bot identity |
| Reactions | Requires bot anyway | Native support |
| Threads | Requires bot anyway | Native support |
| Edit messages | Limited | Full control |
| Delete messages | Limited | Full control |
| Rich interactions | No | Buttons, menus |
| URL management | Complex | Simple IDs |
