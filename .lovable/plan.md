

# Eclipse Portal Bot — Admin Control Dashboard

## What this builds

A new admin page (`/admin/bot-dashboard`) that gives you full visibility and control over the Eclipse Portal Bot directly from the admin panel — no SSH or Discord Developer Portal needed.

## Dashboard sections

### 1. Bot Status & Health
- Calls the bot's health endpoint (`/health`) to show uptime, connected guilds count, and online/offline status
- Manual "Refresh Status" button
- Stores the bot's host URL in a new `bot_settings` table

### 2. Connected Servers
- Lists all guilds the bot is in (fetched via a new edge function that queries Discord API using the bot token)
- Shows server name, member count, icon, and whether a store is linked
- Quick link to configure store-to-server mapping

### 3. Role Configuration Manager
- Full CRUD for `discord_role_configs` entries — create, edit, delete auto-assign roles
- Filter by store / server
- Configure: role ID, role name, min order count, auto-assign on purchase toggle
- Also manage the main server role IDs (Customer, Loyal Customer, Eclipse+, Store Creator, Verified Seller) stored as bot env vars — surfaced as editable settings

### 4. Command Registry
- View all 15 registered slash commands
- "Re-register Commands" button that calls a new edge function to PUT commands via Discord API
- Toggle commands on/off (maintained in a `bot_command_settings` table)

### 5. Bot Actions
- **Send Announcement**: compose and send a message to a selected channel in a selected server
- **Trigger Role Sync**: manually sync roles for a specific user (same as `/update` command but from the dashboard)
- **View Modmail**: link to existing modmail/ticket pages

### 6. Bot Settings
- Edit the bot's environment config (site URL, webhook URL, main guild ID, role IDs) stored in a `bot_settings` table
- These are reference values for the dashboard; the actual bot reads from its `.env` file on the host

## Database changes

**New table: `bot_settings`**
- `id` (uuid, PK)
- `key` (text, unique) — e.g. `bot_host_url`, `main_guild_id`, `customer_role_id`
- `value` (text)
- `updated_at` (timestamptz)
- RLS: admin-only read/write

**New table: `bot_command_settings`**
- `id` (uuid, PK)
- `command_name` (text, unique)
- `enabled` (boolean, default true)
- `updated_at` (timestamptz)
- RLS: admin-only read/write

## New edge functions

1. **`bot-control`** — Proxies requests to the Discord API using the bot token (stored as a secret). Supports actions:
   - `list-guilds` — GET `/users/@me/guilds`
   - `register-commands` — PUT global slash commands
   - `send-message` — POST message to a channel
   - `guild-channels` — GET channels for a guild
   - `sync-roles` — trigger role sync for a user in a guild

2. Uses `DISCORD_CUSTOMER_BOT_TOKEN` secret (already configured)

## Files to create/modify

| File | Action |
|---|---|
| `src/pages/admin/BotDashboard.tsx` | New — main dashboard page |
| `src/components/admin/bot/BotStatusCard.tsx` | New — health/uptime display |
| `src/components/admin/bot/BotServersCard.tsx` | New — connected guilds list |
| `src/components/admin/bot/BotRolesCard.tsx` | New — role config CRUD |
| `src/components/admin/bot/BotCommandsCard.tsx` | New — command registry |
| `src/components/admin/bot/BotActionsCard.tsx` | New — announcement/sync actions |
| `src/components/admin/bot/BotSettingsCard.tsx` | New — env/config editor |
| `supabase/functions/bot-control/index.ts` | New — Discord API proxy |
| `src/App.tsx` | Add route `/admin/bot-dashboard` |
| `src/components/admin/AdminSidebar.tsx` | Add nav link |
| Migration | Create `bot_settings` and `bot_command_settings` tables |

## Access control

- Restricted to `admin` role only (passed via `requiredRoles={['admin']}` on AdminLayout)
- Edge function validates admin JWT before executing any Discord API calls

