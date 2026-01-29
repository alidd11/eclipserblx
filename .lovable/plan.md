
# Remove Installation Code Display from User Interface

## Overview
Since the bot activation is now handled via OAuth (one-click "Add to Server" flow), there's no need to display the alphanumeric installation codes (`BOT-XXXX-XXXX-XXXX`) to users. The backend will continue using these codes internally for license tracking, validation, and enforcement.

## Changes Required

### 1. Downloads Page (`src/pages/Downloads.tsx`)

**Remove from UI:**
- The installation code display block (lines 692-712) showing the code with copy button
- The Discord invite editing section (lines 715-811) - this is legacy functionality that's now handled via the OAuth activation flow
- The `copiedCode` state and `handleCopyCode` function since they're only used for codes

**Keep:**
- The `AddToServerButton` component - this is the new OAuth-based activation flow
- The bot detection logic and badge display

### 2. Bot Installation Page (`src/pages/BotInstallation.tsx`)

This page appears to be legacy documentation for manual installation. Two options:

**Option A (Recommended):** Update the page to reflect the new self-service model
- Remove the "Installation Codes" section entirely
- Update messaging to explain the one-click "Add to Server" flow
- Direct users to the Downloads page to manage their bots

**Option B:** Remove the page entirely and redirect to Downloads

### 3. Cleanup Unused Code

- Remove `installation_code` from the bot codes query in Downloads.tsx
- Remove the discord invite mutation logic (now handled via OAuth)
- Clean up related state variables (`editingDiscord`, `discordInput`, `validatingDiscord`)

## Simplified Bot Card UI

After changes, the bot card on the Downloads page will show:

```
┌────────────────────────────────────────────────────────┐
│  [Bot Image]  LunarCast                                │
│               ✓ Purchased  🤖 Bot                      │
│               Jan 29, 2026                             │
│                                                        │
│  [Add to Server →]  OR  [✓ ServerName - Manage Bot]   │
│                                                        │
│  [★ Leave Review]  [Receipt]                          │
└────────────────────────────────────────────────────────┘
```

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Downloads.tsx` | Remove code display, discord invite editing, and related state |
| `src/pages/BotInstallation.tsx` | Update to reflect self-service model or redirect to Downloads |

### State to Remove from Downloads.tsx
- `copiedCode` / `setCopiedCode`
- `editingDiscord` / `setEditingDiscord`
- `discordInput` / `setDiscordInput`
- `validatingDiscord` / `setValidatingDiscord`
- `updateDiscordMutation`

### Query Changes
The `botCodes` query can be simplified to only fetch:
- `id` (needed for AddToServerButton)
- `order_item_id` (to match with order items)
- `activated_at` (to show activation status)
- `product_name` (for display)
- `discord_guild_name` / `discord_guild_icon` (to show where bot is installed)
- `license_status` (optional, for future status display)

No longer needed:
- `installation_code` (not displayed)
- `is_used` (redundant with activated_at)
- `discord_invite` (not user-editable)
- `discord_member_count` (optional removal)
- `bot_product_id` (not used in UI)

## Summary
This update simplifies the user experience by:
1. Removing technical details (installation codes) that users don't need
2. Removing manual Discord invite management (now automatic via OAuth)
3. Keeping the clean "Add to Server" → "Manage Bot" flow
