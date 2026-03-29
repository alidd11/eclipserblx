

# Consolidate Bot Features into Standalone Dashboard

## Summary

Move all Eclipse Portal Bot-related pages out of the admin sidebar and into the standalone `/bot` dashboard. The admin sidebar keeps only a single "Bot Control" link pointing to `/bot`. This eliminates duplication and makes the bot dashboard the single source of truth.

## What moves to `/bot`

| Current admin location | New home in `/bot` dashboard |
|---|---|
| `/admin/bot-servers` (Bot Servers) | `/bot/servers` (already exists) |
| `/admin/bot-codes` (Bot Codes) | `/bot/settings` — new "License Codes" tab |
| `/admin/botghost-setup` (BotGhost Setup) | `/bot/settings` — new "BotGhost" tab |
| `/admin/portal-bot-setup` (Portal Bot Setup) | `/bot/settings` — new "Portal Bot" tab |
| `/admin/bot-control` | Already redirects to `/bot` — keep as-is |

## What stays in admin sidebar

- **One link only**: "Bot Dashboard" under System group → links to `/bot`
- Remove: Bot Servers, Bot Codes, BotGhost Setup, Portal Bot Setup entries from admin sidebar

## Changes needed

### 1. Admin Sidebar cleanup
**`src/components/admin/AdminSidebar.tsx`**
- Remove `Bot Servers` from Daily Operations group
- Remove `Bot Codes`, `BotGhost Setup`, `Portal Bot Setup` from System group
- Keep single "Bot Dashboard" link → `/bot`

### 2. Bot Settings page expansion
**`src/pages/bot/BotSettings.tsx`**
- Add tabs: General, License Codes, BotGhost, Portal Bot
- Import and embed the existing content from `AdminBotCodes`, `AdminBotGhostSetup`, `AdminPortalBotSetup` components into their respective tabs

### 3. Bot Servers integration
- Verify `/bot/servers` page already covers what `AdminBotServers` shows
- If not, merge the admin bot-servers content into the bot dashboard's servers page

### 4. Route cleanup
**`src/components/AppRoutes.tsx`**
- Add redirects: `/admin/bot-codes` → `/bot/settings`, `/admin/botghost-setup` → `/bot/settings`, `/admin/bot-servers` → `/bot/servers`
- Keep existing pages importable but redirect old URLs

### 5. Seller Discord page
- The seller Discord integration page (`/seller/discord`) stays as-is — it's seller-facing config, not bot management

## Technical details

- No database changes needed
- No new tables or migrations
- Reuses existing admin page components, just re-mounted inside `BotDashboardLayout`
- Old admin URLs redirect to new `/bot/*` locations for bookmarks

