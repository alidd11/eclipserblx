

# Standalone Bot Dashboard — Wick/Dyno Style

## What changes

Transform the bot dashboard from a card inside the admin panel into its own standalone-feeling section at `/bot` (or `/bot-dashboard`) with dedicated layout, sidebar, and branding — similar to how Wick Bot or Dyno Bot have their own web dashboards.

## New layout and routes

### Route structure
```text
/bot                  → Overview (status, stats, quick actions)
/bot/servers          → Server list + per-server management
/bot/commands         → Command toggle/config
/bot/roles            → Role management
/bot/actions          → Send messages / embeds
/bot/settings         → Bot settings + error logs
```

### Standalone layout: `BotDashboardLayout`
- Its own sidebar with bot branding (Eclipse Bot logo/icon, purple accent)
- Dark theme by default (matching Discord aesthetic)
- Own top header with bot name, status indicator (green dot), and user avatar
- No admin sidebar, no admin header — completely independent feel
- Still uses `useAdminAuth` for authentication (admin-only access)
- Mobile: collapsible sidebar with hamburger menu
- Safe-area support for PWA

### Sidebar navigation
- Overview (status + stats)
- Servers (list + manage)
- Commands (toggle on/off, configure)
- Roles (manage role configs)
- Actions (send messages, embeds)
- Settings & Logs

## Pages to build

### 1. Bot Overview (`/bot`)
- Large status hero: online/offline badge, uptime, ping, memory (existing `BotStatusCard` data)
- Stats grid: commands processed, errors, reconnects, servers count
- Quick action buttons: send announcement, refresh status
- Recent errors preview (last 3)

### 2. Server Management (`/bot/servers`)
- Server list with icons, member counts
- Click into a server to see channels, roles, and command permissions for that server

### 3. Commands (`/bot/commands`)
- Full list of all 19+ commands with toggle switches
- Group by category (support, community, moderation, fun)
- Existing `BotCommandsCard` logic extracted into full page

### 4. Roles (`/bot/roles`)
- Existing `BotRolesCard` logic as a full-page view

### 5. Actions (`/bot/actions`)
- Embed builder (existing `BotActionsCard` logic) with live preview
- Server/channel picker

### 6. Settings & Logs (`/bot/settings`)
- Bot settings from `BotSettingsCard`
- Error logs table from `BotErrorLogsCard`

## Files

| File | Action |
|------|--------|
| `src/components/bot-dashboard/BotDashboardLayout.tsx` | New — standalone layout shell |
| `src/components/bot-dashboard/BotDashboardSidebar.tsx` | New — dedicated sidebar |
| `src/pages/bot/BotOverview.tsx` | New — overview page |
| `src/pages/bot/BotServers.tsx` | New — servers page |
| `src/pages/bot/BotCommands.tsx` | New — commands page |
| `src/pages/bot/BotRoles.tsx` | New — roles page |
| `src/pages/bot/BotActions.tsx` | New — actions/embed builder page |
| `src/pages/bot/BotSettings.tsx` | New — settings + logs page |
| `src/components/AppRoutes.tsx` | Add `/bot/*` routes |
| `src/pages/admin/AdminBotDashboard.tsx` | Redirect to `/bot` |
| `src/components/admin/AdminSidebar.tsx` | Update link to point to `/bot` |

## Authentication

- `BotDashboardLayout` uses the same `useAdminAuth` hook
- Only users with `admin` role can access
- No new auth flow needed — just a different layout wrapper

## Design direction

- Dark card-based UI with purple/violet accents (matching the bot's Discord branding)
- Discord-inspired aesthetic: dark backgrounds, rounded cards, status indicators
- Responsive: works on mobile with collapsible sidebar
- Reuses all existing edge function calls (`bot-control`) — no backend changes needed

