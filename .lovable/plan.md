

# Auto-Delete Previous Product Discord Embeds

## Overview

When a product webhook is resent (e.g., after editing a product), the system will automatically delete the previous Discord forum thread before creating a new one. This prevents duplicate product listings in your Discord channels.

## How It Will Work

1. **Send webhook** → Discord creates a forum thread with the product embed
2. **Store reference** → Save the thread ID and message ID in the database
3. **Resend webhook** → Before creating a new thread, delete the old one using the stored IDs
4. **Update reference** → Replace old IDs with new ones

## Implementation Details

### Database Changes

Add two new columns to the `products` table to track Discord webhook references:

| Column | Type | Purpose |
|--------|------|---------|
| `discord_thread_id` | TEXT | The ID of the forum thread created for this product |
| `discord_message_id` | TEXT | The ID of the initial message in that thread |

### Edge Function Updates

Modify `send-product-discord-webhook` to:

1. **Check for existing Discord references** before sending
2. **Delete the previous thread** using the Discord Bot API if a reference exists
3. **Add `?wait=true`** to the webhook URL to receive the message/thread IDs in the response
4. **Store the new IDs** in the products table after successful creation

### Discord API Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    Webhook Request                          │
├─────────────────────────────────────────────────────────────┤
│  1. Receive product_id                                      │
│  2. Query products table for existing discord_thread_id     │
│                                                             │
│  ┌─ If thread exists ──────────────────────────────────┐    │
│  │  DELETE /channels/{thread_id}                       │    │
│  │  (Using Discord Bot Token)                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  3. POST to webhook URL with ?wait=true                     │
│  4. Parse response for id (message) and channel_id (thread) │
│  5. UPDATE products SET discord_thread_id, discord_message_id│
│  6. Return success                                          │
└─────────────────────────────────────────────────────────────┘
```

### Important Considerations

- **Bot Token Required**: The existing `DISCORD_BOT_TOKEN` secret will be used to delete threads (webhooks cannot delete forum threads themselves)
- **Bot Permissions**: The bot must have "Manage Threads" permission in the forum channels
- **Graceful Failures**: If deletion fails (thread already deleted, permissions), the new webhook will still be sent
- **Rate Limiting**: A small delay will be added between delete and create operations

## Technical Summary

| Component | Change |
|-----------|--------|
| Database | Add `discord_thread_id` and `discord_message_id` columns to `products` |
| Edge Function | Update `send-product-discord-webhook` to delete old threads and store new IDs |
| Permissions | Bot needs "Manage Threads" permission in Discord forum channels |

## Files to Modify

1. **Database Migration** - Add two columns to products table
2. **`supabase/functions/send-product-discord-webhook/index.ts`** - Add delete logic and ID storage

