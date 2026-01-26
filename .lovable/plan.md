

# Paid Discord Advertisement System

## Overview

This plan implements a system where customers can purchase paid advertisements that automatically post embeds to a dedicated Discord channel. The system will allow customers to create, pay for, and have their advertisements automatically posted to Discord.

---

## What This Feature Does

1. Customers visit an "Advertise" page on your website
2. They fill out a form with their advertisement details (title, description, image, link)
3. They pay via Stripe checkout (one-time payment)
4. Upon successful payment, the advertisement is automatically posted to a dedicated Discord channel as an embedded message
5. Admins can configure the advertisement webhook URL and pricing in settings

---

## Technical Implementation

### 1. Database Schema

Create a new `discord_advertisements` table to store advertisement records:

```text
Table: discord_advertisements
├── id (uuid, primary key)
├── user_id (uuid, references auth.users)
├── title (text, not null) - Ad headline
├── description (text, not null) - Ad body text
├── image_url (text, nullable) - Optional promotional image
├── link_url (text, nullable) - Call-to-action URL
├── discord_username (text, nullable) - Advertiser's Discord
├── status (text) - pending, paid, posted, failed
├── payment_id (text) - Stripe payment/session ID
├── price_paid (numeric) - Amount charged
├── posted_at (timestamp) - When sent to Discord
├── discord_message_id (text) - Message ID after posting
├── created_at (timestamp)
└── updated_at (timestamp)
```

RLS Policies:
- Users can INSERT their own advertisements
- Users can SELECT their own advertisements
- Staff can SELECT/UPDATE all advertisements

### 2. Admin Configuration

Add new settings to the Discord Settings page (`/admin/discord-settings`):

| Setting Key | Description |
|-------------|-------------|
| `advertisements_discord_webhook_url` | Webhook URL for the ads channel |
| `advertisement_price` | Price in GBP (e.g., 5.00) |
| `advertisements_enabled` | Toggle to enable/disable the feature |

This will be added as a new tab in the existing Discord Settings page.

### 3. New Edge Function: `create-advertisement-checkout`

Creates a Stripe checkout session for advertisement purchases:

```text
Flow:
1. Receive ad details from frontend (title, description, image, link)
2. Validate inputs (title required, reasonable length limits)
3. Create pending record in discord_advertisements table
4. Create Stripe checkout session with ad_id in metadata
5. Return checkout URL to redirect user
```

### 4. New Edge Function: `send-advertisement-discord-webhook`

Posts the advertisement to Discord after payment:

```text
Flow:
1. Receive advertisement_id
2. Fetch advertisement details from database
3. Build Discord embed with:
   - Title and description
   - Optional image
   - CTA button/link
   - Footer with advertiser info
4. POST to configured webhook URL
5. Update advertisement status and message_id
```

### 5. Payment Verification Integration

Modify the existing `verify-payment` or create a webhook handler to:
- Detect advertisement purchases from metadata
- Call `send-advertisement-discord-webhook` upon successful payment
- Update advertisement status to 'posted'

### 6. Frontend Components

**New Page: `/advertise`**
- Form to create an advertisement:
  - Title (required, max 100 chars)
  - Description (required, max 500 chars)
  - Image URL (optional)
  - Link URL (optional)
  - Discord username (optional, for contact)
- Price display
- "Pay & Post" button that initiates checkout

**Customer View: `/account/advertisements`**
- List of user's advertisements with status
- View posted ads with Discord message links

**Admin View: Existing Discord Settings**
- New "Advertisements" tab with:
  - Webhook URL configuration
  - Price setting
  - Enable/disable toggle
  - Test webhook button
  - Recent advertisements list

---

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/migrations/xxx.sql` | Create discord_advertisements table |
| `supabase/functions/create-advertisement-checkout/index.ts` | New edge function |
| `supabase/functions/send-advertisement-discord-webhook/index.ts` | New edge function |
| `supabase/functions/verify-payment/index.ts` | Add advertisement handling |
| `src/pages/Advertise.tsx` | New customer-facing page |
| `src/pages/Account/MyAdvertisements.tsx` | New account section |
| `src/pages/admin/DiscordSettings.tsx` | Add Advertisements tab |
| `src/App.tsx` | Add new routes |

---

## Discord Embed Format

```text
┌─────────────────────────────────────┐
│ 📢 [Advertisement Title]           │
├─────────────────────────────────────┤
│                                     │
│ [Description text goes here...]    │
│                                     │
│ [Optional Image]                    │
│                                     │
│ 🔗 Learn More → [link]              │
│                                     │
├─────────────────────────────────────┤
│ Sponsored • Posted by @username    │
│ Eclipse Marketplace                 │
└─────────────────────────────────────┘
```

---

## Security Considerations

1. **Content Moderation**: Advertisements are posted immediately after payment. Consider adding an optional admin approval queue for sensitive deployments.
2. **Rate Limiting**: Apply rate limits on the checkout endpoint to prevent abuse.
3. **Input Validation**: Sanitize all text inputs to prevent Discord embed injection.
4. **RLS Policies**: Users can only view/create their own advertisements.

---

## Future Enhancements (Not in Scope)

- Admin moderation queue before posting
- Different pricing tiers (featured, premium placement)
- Scheduling advertisements for specific times
- Analytics on ad performance (clicks, impressions)

