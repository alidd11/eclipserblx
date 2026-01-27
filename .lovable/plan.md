
# Enable Scheduled Release Notifications and Discord Webhooks

## Problem Analysis

The scheduled product release notifications are failing due to multiple issues:

1. **Global Setting Disabled**: The `new_product_notifications_enabled` setting in the database is set to `false`, causing `notify-scheduled-release` to exit early without processing any products.

2. **Product Status Requirement**: The current logic requires `is_active = true` to notify, but scheduled products may remain inactive (hidden) until their release time passes - this creates a chicken-and-egg problem.

3. **Uses Simple Discord Webhook**: The `notify-scheduled-release` function sends a basic embed to the seller's store webhook, but doesn't use the category-specific forum webhooks that `send-product-discord-webhook` uses (which creates proper forum threads).

4. **No Automatic Product Activation**: When a scheduled product's `release_at` time passes, the product should automatically become active, but nothing triggers this.

---

## Implementation Plan

### Step 1: Enable Global Notification Setting
**Database Update**

Update the `settings` table to enable the global notification flag:
- Set `new_product_notifications_enabled` to `true`

---

### Step 2: Update notify-scheduled-release Edge Function
**File**: `supabase/functions/notify-scheduled-release/index.ts`

**Changes:**

1. **Remove `is_active` requirement for scheduled products**: Products with `release_at` should be picked up when their time passes, regardless of current `is_active` status.

2. **Automatically activate products**: When processing a scheduled release, set `is_active = true` to make the product visible.

3. **Call `send-product-discord-webhook` for category-specific webhooks**: Instead of sending a simple Discord embed to the store's webhook, invoke the existing `send-product-discord-webhook` function which properly handles category-specific forum channels, templates, and thread creation.

4. **Add tracking column**: Add a `release_notified_at` timestamp to prevent duplicate notifications (more reliable than checking the notifications table).

---

### Step 3: Database Migration
**New Migration**

Add a `release_notified_at` column to the `products` table:
```sql
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS release_notified_at TIMESTAMPTZ;
```

This provides a reliable way to track which products have already been processed.

---

### Step 4: Updated Edge Function Logic

**Revised Query Logic:**
- Find products where:
  - `release_at` is not null AND
  - `release_at` has passed (≤ now) AND
  - `release_notified_at` is null (not yet notified)

**Processing Steps for Each Product:**
1. Set `is_active = true` (make product visible)
2. Set `release_notified_at = now()` (mark as processed)
3. Call `send-product-discord-webhook` with full product details
4. Send in-app + push notifications to store followers

---

## Technical Details

### Updated notify-scheduled-release Function Flow

```text
┌─────────────────────────────────┐
│  Check global setting enabled   │
└─────────────────┬───────────────┘
                  ▼
┌─────────────────────────────────┐
│  Query: release_at <= now()     │
│  AND release_notified_at IS NULL│
└─────────────────┬───────────────┘
                  ▼
     ┌────────────────────────┐
     │  For each product:     │
     └────────────┬───────────┘
                  ▼
┌─────────────────────────────────┐
│ 1. Update product:              │
│    - is_active = true           │
│    - release_notified_at = now()│
└─────────────────┬───────────────┘
                  ▼
┌─────────────────────────────────┐
│ 2. Call send-product-discord-   │
│    webhook for forum post       │
└─────────────────┬───────────────┘
                  ▼
┌─────────────────────────────────┐
│ 3. Send in-app notifications    │
│    to store followers           │
└─────────────────┬───────────────┘
                  ▼
┌─────────────────────────────────┐
│ 4. Send push notifications      │
│    to opted-in followers        │
└─────────────────────────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/notify-scheduled-release/index.ts` | Major rewrite to fix logic and integrate with category webhooks |
| Database migration | Add `release_notified_at` column |
| Database update | Set `new_product_notifications_enabled = true` |

---

## Benefits

1. **Reliable tracking**: Using `release_notified_at` instead of checking notifications table prevents duplicates
2. **Automatic activation**: Products become visible when their scheduled time arrives
3. **Consistent Discord formatting**: Uses the same rich forum embeds as manually published products
4. **Category-specific channels**: Posts go to the correct Discord forum channel based on product category
