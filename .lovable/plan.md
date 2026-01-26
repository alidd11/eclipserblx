

# Plan: Add Eclipse Store Discord Channels to Admin Dashboard

## Overview
The main Eclipse Store currently has no Discord notification channels configured, unlike community sellers who can set up order webhooks, review webhooks, and Discord role integration. This plan adds a dedicated section to the admin Discord Settings page where administrators can configure these channels specifically for the Eclipse Store.

## Current State
- The Eclipse Store (ID: `STR-A9759F`) exists in the database but has all Discord fields set to null
- Community sellers configure their Discord settings via `/seller/settings/notifications`
- Admin Discord Settings (`/admin/discord-settings`) manages global webhooks but not the Eclipse Store's per-store webhooks

## What Will Be Added

### New "Eclipse Store" Tab in Discord Settings
A new tab in the admin Discord Settings page with:

1. **Order Notifications Channel**
   - Webhook URL field for Eclipse Store orders
   - Test button to verify the webhook works
   - Status indicator when configured

2. **Review Notifications Channel**  
   - Webhook URL field for Eclipse Store reviews
   - Test button with sample review notification
   - Status indicator when configured

3. **Discord Role Integration**
   - Bot Token field (for assigning roles on purchase)
   - Server (Guild) ID field
   - Customer Role ID field
   - Configuration status indicator

### Technical Implementation

**Database Updates:**
- No schema changes needed - the `stores` table already has all required columns
- Updates will be made directly to the Eclipse Store row

**File Changes:**
1. `src/pages/admin/DiscordSettings.tsx`
   - Add new "Eclipse Store" tab to the existing TabsList
   - Create form section for Eclipse Store-specific Discord settings
   - Add save mutation to update the `stores` table for the Eclipse Store
   - Add test webhook functions matching the seller notification page

**UI/UX:**
- Tab will use the Store icon
- Form layout will match the seller notification settings page for consistency
- Will include the same "How to Create a Discord Webhook" help section
- Test buttons for both order and review webhooks

## Implementation Steps

1. Add the Eclipse Store ID constant to the Discord Settings page
2. Create a new query to fetch the Eclipse Store's current Discord settings
3. Add local state for the Eclipse Store form fields
4. Create a save mutation for updating the Eclipse Store's Discord settings
5. Add test webhook functions for orders and reviews
6. Add the new "Eclipse Store" tab with the complete notification form

## Benefits
- Centralizes all Discord configuration in one admin page
- Eclipse Store orders/reviews will be routed to dedicated channels
- Enables Discord role assignment for main store customers
- Matches the feature parity that community sellers already have

