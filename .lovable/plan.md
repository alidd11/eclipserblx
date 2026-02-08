

# Global Guard - Cross-Server Ban Management System

## Overview

**Global Guard** is a dedicated subdomain dashboard (`guard.eclipserblx.com`) that allows customers to manage bans across all Discord servers where they have the Eclipse bot installed. It includes AI-generated branding (logo and banner) for a professional, cohesive identity.

---

## Branding Design

### Logo Concept
A shield icon with a stylized "G" incorporating protective elements - using a deep blue/purple gradient that conveys security and authority. Modern, clean vector style suitable for Discord bot avatar and dashboard favicon.

### Banner Concept
Wide abstract design (1200x400) featuring flowing gradients in blue/purple tones with subtle shield/security iconography and geometric patterns. Professional tech aesthetic matching the Eclipse marketplace style.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         User's Browser                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│   guard.eclipserblx.com  ──►  Same React App (subdomain detection)  │
│                                                                      │
│   Routes:                                                            │
│   /         → Dashboard home (ban stats, quick actions)              │
│   /bans     → Global ban list with search/filter                     │
│   /servers  → Connected servers overview                             │
│   /history  → Audit log of all actions                               │
│   /settings → Dashboard preferences                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Edge Functions                                │
│                                                                      │
│   global-ban-api      → CRUD for bans from dashboard                 │
│   sync-global-bans    → Propagate bans to all servers                │
│   discord-customer-bot → /globalban, /globalunban commands           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Database                                     │
│                                                                      │
│   global_bans        → Active ban records                            │
│   global_ban_logs    → Audit trail                                   │
│   global_ban_sync    → Sync status per server                        │
│   global_guard_settings → User preferences                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Branding Assets
- Create edge function `generate-global-guard-branding` using the existing AI image generation pattern
- Generate logo (shield + "G" design, blue/purple gradient, 512x512)
- Generate banner (wide format, security-themed abstract design, 1200x400)
- Store assets in `store-branding` bucket under `global-guard/` prefix
- Create static fallback assets in case generation fails

### Phase 2: Database Schema

**Table: `global_bans`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| owner_user_id | uuid | Eclipse user who created the ban |
| banned_discord_id | text | Discord ID of banned user |
| banned_username | text | Username at time of ban |
| banned_avatar_url | text | Avatar at time of ban |
| reason | text | Ban reason |
| ban_type | enum | permanent / temporary |
| expires_at | timestamp | For temporary bans |
| created_at | timestamp | When ban was created |
| created_via | text | "dashboard" / "discord_command" |
| is_active | boolean | Whether ban is currently active |

**Table: `global_ban_logs`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| ban_id | uuid | References global_bans |
| action | text | created / revoked / expired / synced |
| guild_id | text | Server where action occurred (if applicable) |
| performed_by | uuid | User who performed action |
| details | jsonb | Additional context |
| created_at | timestamp | When action occurred |

**Table: `global_ban_sync_status`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| ban_id | uuid | References global_bans |
| guild_id | text | Server ID |
| guild_name | text | Server name at sync time |
| status | enum | pending / success / failed / missing_permissions |
| error_message | text | Error details if failed |
| synced_at | timestamp | When sync was attempted |

### Phase 3: Edge Functions

**`global-ban-api`**
- POST `/` - Create new global ban
- GET `/` - List user's global bans (with pagination, search)
- DELETE `/:id` - Revoke a ban
- GET `/stats` - Dashboard statistics
- GET `/servers` - List connected servers with sync status

**`sync-global-bans`**
- Triggered when ban is created
- Iterates through all `bot_installation_codes` where user has active license
- Calls Discord API to ban user in each server
- Records sync status for each server

**Discord Commands (extend `discord-customer-bot`)**
- `/globalban <user> [reason] [duration]` - Ban across all servers
- `/globalunban <user>` - Remove global ban
- `/globalbans` - View current bans (links to dashboard)

### Phase 4: Dashboard UI

**Subdomain Detection Hook**
```typescript
// Detects if running on guard.eclipserblx.com
const isGlobalGuardDomain = hostname.startsWith('guard.');
```

**New Components**
- `GlobalGuardLayout` - Dedicated layout with shield branding
- `GlobalGuardSidebar` - Navigation for guard dashboard
- `BanListTable` - Searchable, sortable ban list
- `AddBanDialog` - Form to add new bans
- `ServerOverview` - Grid of connected servers with status
- `BanHistoryTimeline` - Chronological audit log
- `BanStatsCards` - Quick statistics (active bans, servers protected, etc.)

**PWA Configuration**
- Separate manifest for Global Guard subdomain
- Shield-themed icons and splash screens
- Distinct theme color (deep blue)

### Phase 5: DNS & Domain Setup

**Required Action (User)**
1. Add DNS A record: `guard` → `185.158.133.1`
2. Add subdomain in Lovable Project Settings → Domains

---

## Security Considerations

- All endpoints require authentication
- Bans only propagate to servers where user has active bot license
- Rate limiting on ban creation (prevent abuse)
- Full audit logging of all actions
- RLS policies ensure users only see their own bans

---

## Discord API Integration

Uses existing `DISCORD_CUSTOMER_BOT_TOKEN` for:
- `PUT /guilds/{guild.id}/bans/{user.id}` - Create ban
- `DELETE /guilds/{guild.id}/bans/{user.id}` - Remove ban
- Handles permission errors gracefully (bot may lack ban permissions in some servers)

---

## File Changes Summary

| Category | Files |
|----------|-------|
| Edge Functions | 3 new, 1 modified |
| Database | 1 migration (4 tables) |
| Hooks | 2 new (subdomain detection, global guard data) |
| Components | ~12-15 new components |
| Pages | 5 new pages |
| PWA | 1 new manifest |
| Types | 1 new types file |

---

## Technical Notes

- Reuses existing authentication flow (same user accounts)
- Leverages `bot_installation_codes` table to find user's servers
- AI branding uses same pattern as `generate-store-branding` function
- Dashboard styling follows existing premium visual identity (dark theme, violet accents adapted to blue)

