

# Self-Service Bot Installation (Invite-Based Model)

## Overview

Transform the current manual bot installation process into a self-service invite-based system, similar to popular bots like MEE6, Dyno, or Carl-bot. Customers will be able to add purchased bots to their Discord server with a single click, eliminating staff involvement for standard installations.

## Current State Analysis

### How It Works Today
1. Customer purchases a bot product
2. System generates an installation code (BOT-XXXX-XXXX-XXXX)
3. Customer opens a support ticket with their code
4. Staff manually verifies the code
5. Staff asks for Discord server details
6. Staff deploys/configures the bot (24-48 hours)
7. Customer receives email notifications at each stage

### Problem
- 24-48 hour wait time for bot installation
- Requires staff availability and manual work
- Creates support ticket volume
- Poor customer experience compared to modern SaaS bots

---

## Proposed Architecture

### Model: Centralized Multi-Tenant Bot

Instead of deploying individual bot instances per customer, the system will use a **single hosted bot** that serves all customers, similar to how MEE6/Dyno work:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Eclipse Bot Infrastructure                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌────────────┐      ┌────────────────────┐                   │
│    │ Customer A │──┬───│                    │                   │
│    │  Server    │  │   │   Hosted Bot       │                   │
│    └────────────┘  │   │   (Single Instance)│                   │
│                    │   │                    │                   │
│    ┌────────────┐  │   │  - Music playback  │                   │
│    │ Customer B │──┼───│  - Moderation      │                   │
│    │  Server    │  │   │  - Per-server      │                   │
│    └────────────┘  │   │    configuration   │                   │
│                    │   │                    │                   │
│    ┌────────────┐  │   └────────────────────┘                   │
│    │ Customer C │──┘                                            │
│    │  Server    │                                               │
│    └────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Infrastructure Requirements

1. **Centrally Hosted Discord Bot**: A single bot application running on your infrastructure (e.g., a VPS, Railway, or similar)
2. **Bot Dashboard**: Web-based configuration panel for customers
3. **License Validation**: Ensure only paying customers can use the bot
4. **Per-Server Configuration**: Store settings per Discord guild

---

## Implementation Plan

### Phase 1: Database Schema Updates

Add new tables and columns to support self-service installation:

**New `bot_products` table:**
- Links product IDs to hosted bot configurations
- Stores Discord Application ID per bot type
- Stores OAuth2 invite URL template
- Stores required permissions bitmask

**Updates to `bot_installation_codes` table:**
- Add `guild_id` column (Discord server ID)
- Add `activated_at` timestamp
- Add `license_status` (active/expired/revoked)
- Remove dependency on staff workflow

**New `bot_guild_settings` table:**
- Per-server configuration storage
- `guild_id`, `bot_product_id`, `settings_json`
- Feature toggles, prefix customization, etc.

### Phase 2: Self-Service Installation Flow

**New Customer Journey:**

1. **Purchase**: Customer buys a bot product
2. **Instant Access**: Downloads page shows "Add to Server" button instead of installation code
3. **OAuth2 Flow**: Button redirects to Discord OAuth2 authorize URL:
   ```
   https://discord.com/oauth2/authorize?
     client_id={BOT_APPLICATION_ID}&
     permissions={REQUIRED_PERMISSIONS}&
     scope=bot+applications.commands&
     redirect_uri={YOUR_CALLBACK_URL}&
     state={ENCRYPTED_LICENSE_CODE}
   ```
4. **Server Selection**: Customer selects their Discord server
5. **License Activation**: Callback edge function validates purchase and activates license
6. **Confirmation**: Customer redirected to success page with bot setup guide

### Phase 3: Edge Functions

**New `activate-bot-license` edge function:**
- Receives OAuth2 callback with `code` and `state` parameters
- Exchanges code for access token (to get guild info)
- Validates that the user's installation code is legitimate
- Records the guild_id against the license
- Marks the installation as activated
- Returns success page or redirects to dashboard

**New `validate-bot-license` edge function:**
- Called by the hosted bot to check if a guild is licensed
- Accepts `guild_id` and `bot_product_id`
- Returns license status and expiration (if applicable)
- Used by bot to enable/disable features per server

**New `bot-guild-settings` edge function:**
- GET/POST for customers to configure their bot settings
- Validates ownership via Discord OAuth
- Stores/retrieves per-server configuration

### Phase 4: UI Updates

**Downloads Page (`src/pages/Downloads.tsx`):**
- Replace installation code display with "Add to Server" button for bot products
- Show "Manage Bot" link for already-activated bots
- Display activation status and server name

**New Bot Dashboard Page (`/bot-dashboard`):**
- Server selector (for users with bot in multiple servers)
- Per-server settings panel
- Feature toggles and configuration
- License status and renewal info

**Updated Bot Installation Page (`src/pages/BotInstallation.tsx`):**
- Simplify to show one-click activation flow
- Remove manual ticket-based instructions
- Add troubleshooting section for common issues

### Phase 5: Bot-Side Integration

The hosted Discord bot needs to:
1. Check license validity on `guild_join` event
2. Periodically validate licenses for connected servers
3. Gracefully disable features for unlicensed servers
4. Fetch per-server settings from the API

---

## Technical Details

### Discord OAuth2 Scopes Needed
- `bot` - To add the bot to servers
- `applications.commands` - For slash commands
- `guilds` - To see which servers user can manage
- `identify` - To link Discord user to Eclipse account

### Security Considerations
- State parameter encrypted with HMAC to prevent CSRF
- License codes validated server-side only
- Guild ownership verified via Discord API
- Rate limiting on activation endpoints

### Required Secrets
- `BOT_OAUTH_CLIENT_ID` - Discord application client ID (per bot product)
- `BOT_OAUTH_CLIENT_SECRET` - Discord application secret

---

## Migration Path

For existing customers with pending installations:
1. Staff can manually activate their license with guild_id
2. Or customers can use the new self-service flow
3. Existing installation codes remain valid and can be converted

---

## Scope Clarification

This plan assumes:
1. You have or will host a centralized Discord bot (not customer-hosted)
2. The bot code itself exists and works
3. The bot can call your API endpoints for license validation
4. You control the Discord application(s) for these bots

If you're selling downloadable bot code (self-hosted by customers), a different approach would be needed involving license key validation within the bot code itself.

---

## Summary of Changes

| Component | Changes |
|-----------|---------|
| Database | 3 new/updated tables, 5+ new columns |
| Edge Functions | 3 new functions |
| Frontend Pages | 3 pages updated/created |
| Discord Bot | License validation integration required |

