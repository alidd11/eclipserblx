


# Plan: Add Eclipse Store Discord Channels to Admin Dashboard

**STATUS: COMPLETED ✅**

## Overview
The main Eclipse Store now has Discord notification channels configured via the admin Discord Settings page, matching the feature parity that community sellers already have.

## What Was Added

### New "Eclipse Store" Tab in Discord Settings
A new tab in the admin Discord Settings page (`/admin/discord-settings`) with:

1. **Order Notifications Channel**
   - Webhook URL field for Eclipse Store orders (`discord_webhook_url`)
   - Test button to verify the webhook works
   - Status indicator when configured

2. **Review Notifications Channel**  
   - Webhook URL field for Eclipse Store reviews (`review_discord_webhook_url`)
   - Test button with sample review notification
   - Status indicator when configured

3. **Discord Role Integration**
   - Bot Token field (`discord_bot_token`)
   - Server (Guild) ID field (`discord_guild_id`)
   - Customer Role ID field (`discord_role_id`)
   - Configuration status indicator

### Technical Implementation

**Database Updates:**
- No schema changes needed - used existing `stores` table columns
- Updates are made directly to the Eclipse Store row (ID: `STR-A9759F`)

**File Changes:**
1. `src/pages/admin/DiscordSettings.tsx`
   - Added `Store` and `ShieldCheck` icons to imports
   - Added `ECLIPSE_STORE_ID` constant
   - Added `EclipseStoreSettings` interface
   - Added Eclipse Store state variables and test result states
   - Added query to fetch Eclipse Store's current Discord settings
   - Added save mutation for updating the Eclipse Store's Discord settings
   - Added test webhook functions for orders and reviews
   - Added "Eclipse Store" tab to mobile dropdown navigation
   - Added "Eclipse Store" tab to desktop TabsList
   - Added new `TabsContent` for "eclipse-store" with full form UI

## Benefits
- Centralizes all Discord configuration in one admin page
- Eclipse Store orders/reviews will be routed to dedicated channels
- Enables Discord role assignment for main store customers
- Matches the feature parity that community sellers already have
