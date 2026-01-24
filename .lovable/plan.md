

# New Product Discord Forum Webhook

## Overview
Create an automated Discord webhook notification that sends a rich, professional product embed to a "forum channel" whenever a new product is uploaded via the admin dashboard. The embed will match the template shown in the reference image with product details, purchase options, and images.

## What This Will Do
- When an admin creates a new product in the dashboard, a formatted Discord notification is automatically sent
- The notification will include product information, features, category disclaimer, purchase locations (Robux/GBP/Eclipse+ pricing), and product images
- A new webhook URL setting will be added for the "Products Forum" channel
- The feature integrates into the existing "Announce" dropdown menu for easy configuration

---

## Changes Required

### 1. New Backend Function
Create `supabase/functions/send-product-discord-webhook/index.ts`:
- Accepts product details (id, name, description, price, robux_price, category, images)
- Fetches the `product_forum_webhook_url` from settings
- Builds a Discord embed matching the template style:
  - **Title**: Product name
  - **Product Information**: Description about the product
  - **Features List**: Extracted bullet points (if available in description)
  - **Category Disclaimer**: Auto-generated based on category (e.g., "Savers", "Premium")
  - **Purchase Locations**: Robux price, GBP price, Eclipse+ discounted price
  - **Support Contact**: Standard support message
  - **Images**: Up to 4 product images as embeds
  - **Footer**: "The Eclipse Team"
- Sends to Discord via webhook

### 2. Discord Settings Update
Modify `src/pages/admin/DiscordSettings.tsx`:
- Add `product_forum_webhook_url` to the settings interface
- Create new "Products" tab for managing the forum webhook
- Add test functionality for the webhook
- Update the "Announce" dropdown to include product-related options (if needed for manual triggers)

### 3. Admin Products Integration
Modify `src/pages/admin/Products.tsx`:
- After successfully creating a new product, call the `send-product-discord-webhook` function
- This happens in the existing `saveMutation` alongside the push notification logic

### 4. Configuration
Update `supabase/config.toml`:
- Register the new edge function

---

## Technical Details

### Discord Embed Structure
```text
┌─────────────────────────────────────────────┐
│ 🏠 Eclipse - [Product Name]                 │
├─────────────────────────────────────────────┤
│ **Product Information**                     │
│ The following product is made for Roblox.   │
│                                             │
│ [Product description from database]         │
│                                             │
│ **Features List**                           │
│ - Feature 1                                 │
│ - Feature 2                                 │
│ - Feature 3                                 │
│                                             │
│ **[Category] Disclaimer**                   │
│ [Auto-generated category info]              │
│                                             │
│ **Purchase Locations**                      │
│ 🔵 [Robux Price] - Eclipse Roblox Hub       │
│ 💷 [GBP Price] - Our Store                  │
│ 🌙 30% Off - Buy Now (Eclipse+ members)     │
│                                             │
│ For assistance, contact @support            │
├─────────────────────────────────────────────┤
│ [Product Image 1]                           │
│ [Product Image 2]                           │
├─────────────────────────────────────────────┤
│ 🌑 The Eclipse Team                         │
└─────────────────────────────────────────────┘
```

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/send-product-discord-webhook/index.ts` | New edge function for product announcements |

### Files to Modify
| File | Changes |
|------|---------|
| `supabase/config.toml` | Register new function |
| `src/pages/admin/DiscordSettings.tsx` | Add "Products" tab + webhook setting |
| `src/pages/admin/Products.tsx` | Trigger webhook on product creation |

### Database Setting
A new setting key `product_forum_webhook_url` will be used to store the Discord webhook URL for the products forum channel.

---

## User Experience
1. Admin navigates to **Discord Settings → Products** tab
2. Admin pastes their Discord webhook URL for the products forum channel
3. Admin clicks "Save" (or tests with "Test Webhook")
4. When any new product is created in the Admin Products page, a formatted notification is automatically sent to the configured channel
5. The notification matches the professional template shown in the reference image

