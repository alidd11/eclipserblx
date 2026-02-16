

# Booster 50% Discount via DM

## Overview
When a member boosts the server, the `send-boost-log` function will also:
1. Generate a unique, user-locked 50% discount code
2. Save it to the `discount_codes` table with a new `restricted_to_user_id` column so only that user can redeem it
3. Send the code to the booster via Discord DM
4. The checkout flow will validate this restriction so no one else can use the code

## What Changes

### 1. Database: Add `restricted_to_user_id` column to `discount_codes`
- A new nullable `uuid` column on the existing `discount_codes` table
- When set, only that specific user can use the code

### 2. Checkout Validation (src/pages/Checkout.tsx)
- After fetching the discount code, check if `restricted_to_user_id` is set
- If it is, compare it to the logged-in user's ID and reject if they don't match

### 3. Edge Function: Update `send-boost-log/index.ts`
When `action === "boosted"`:
- Look up the user's profile by `discord_id` to get their `user_id`
- Generate a unique code (e.g., `BOOST-XXXXXX`)
- Insert it into `discount_codes` with:
  - `discount_type: 'percentage'`, `discount_value: 50`
  - `max_uses: 1` (single use)
  - `restricted_to_user_id` set to the booster's user ID
  - An expiry date (e.g., 30 days)
- Open a Discord DM channel with the booster and send them an embed with the code
- Continue sending the boost log embed as normal

### 4. Discord DM Helper
Add a `sendDirectMessage` helper to `_shared/discord-bot.ts` that:
- Creates a DM channel via `POST /users/@me/channels` with `recipient_id`
- Sends the message to that DM channel
- Gracefully handles users with DMs disabled

## Technical Details

### DM Embed Design
- Color: Pink/Magenta (matching the boost embed)
- Title: "Thank You for Boosting!"
- Description: "Here's your exclusive 50% discount code"
- Code displayed prominently in a field
- Expiry date mentioned
- Note that the code is single-use and only for them

### Checkout Restriction Logic
```text
if (discount.restricted_to_user_id && discount.restricted_to_user_id !== user.id) {
  show error: "This discount code is not available for your account"
  return
}
```

### Edge Function Payment Validation
The server-side payment functions (`create-checkout`, `create-payment-intent`, `charge-saved-method`) also validate discounts -- they will need the same `restricted_to_user_id` check added to prevent bypass.

### Graceful Handling
- If the booster's Discord ID isn't linked to a platform account, skip discount generation and just log the boost
- If the user has DMs disabled, the discount is still created and usable -- they just won't get the DM notification
