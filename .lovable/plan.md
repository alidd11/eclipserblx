

# Category-Specific Discord Forum Channels

## Overview
Update the product Discord notification system so that each product category posts to its own dedicated Discord forum channel. Instead of a single `product_forum_webhook_url`, you'll configure a separate webhook URL for each category.

## How It Will Work

### Current Setup
Right now, all products go to one Discord forum channel using `product_forum_webhook_url`.

### New Setup
Each of your 6 categories will have its own webhook URL:

| Category | Setting Key | Discord Channel |
|----------|-------------|-----------------|
| 3D Models | `product_webhook_3d_models` | Your 3D Models forum |
| Bots | `product_webhook_bots` | Your Bots forum |
| Eclipse Savers | `product_webhook_eclipse_savers` | Your Savers forum |
| Scripts & Systems | `product_webhook_scripts_systems` | Your Scripts forum |
| UI Kits | `product_webhook_ui_kits` | Your UI Kits forum |
| Vehicle Liveries | `product_webhook_vehicle_liveries` | Your Liveries forum |

---

## User Experience

### Configuration
1. Go to **Admin > Discord Settings > Products** tab
2. You'll see a list of all your categories
3. Paste each category's Discord forum webhook URL in its field
4. Click **Save**
5. Optionally test each webhook individually

### When Uploading Products
1. Create a new product as normal
2. Select its category (e.g., "Bots")
3. Save the product
4. The system automatically sends the notification to the **Bots** forum channel
5. If no webhook is configured for that category, it skips silently

---

## Changes Required

### 1. Discord Settings Page Update
**File**: `src/pages/admin/DiscordSettings.tsx`

- Remove the single `product_forum_webhook_url` field
- Replace with a dynamic list showing each category from the database
- Each category row has its own webhook URL input
- Add a "Test" button for each category's webhook
- Categories are loaded from the database automatically

### 2. Edge Function Update
**File**: `supabase/functions/send-product-discord-webhook/index.ts`

- Accept `category_id` in the payload (already has `category_name`)
- Look up the webhook using the category slug: `product_webhook_{category_slug}`
- If no webhook is configured for that category, skip gracefully
- Keep the same embed format and forum post creation

### 3. Products Page Update
**File**: `src/pages/admin/Products.tsx`

- Pass the `category_id` to the webhook function (minor update)
- The category name is already being passed

---

## Technical Details

### New Settings Keys Format
```text
product_webhook_3d_models
product_webhook_bots
product_webhook_eclipse_savers
product_webhook_scripts_systems
product_webhook_ui_kits
product_webhook_vehicle_liveries
```

### Flow Diagram
```text
Admin uploads product (Category: Bots)
          ↓
Products.tsx calls edge function with category info
          ↓
Edge function looks up "product_webhook_bots" setting
          ↓
If webhook exists → Post to Bots forum channel
If no webhook → Skip silently (no error)
```

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/admin/DiscordSettings.tsx` | Replace single webhook with category-based list |
| `supabase/functions/send-product-discord-webhook/index.ts` | Look up webhook by category slug |
| `src/pages/admin/Products.tsx` | Pass category_id to webhook function |

---

## Fallback Behaviour
- If a category doesn't have a webhook configured, the product is created normally but no Discord notification is sent
- If **all** categories should go to one channel as a fallback, we can add a "Default Webhook" option that's used when no category-specific one exists

