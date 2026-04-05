

## Unified Internal Messaging — Single-Page Channel System

### Current State
Two separate pages exist — **Staff Messages** (`/admin/staff-messages`) and **Admin Chat** (`/admin/admin-chat`) — each backed by its own DB table (`staff_chat_messages`, `admin_chat_messages`), reactions table, and storage bucket. They share the same `StaffChatRoom` component but are configured independently.

### Proposed Architecture
Replace both pages with a **single unified messaging page** at `/admin/messages` that uses a **channel sidebar + main chat area** layout (Slack/Teams pattern). The two existing DB tables remain as-is (no data migration needed) — channels simply switch which config is active.

```text
┌──────────────────────────────────────────────────┐
│  Internal Messages                               │
├────────────┬─────────────────────────────────────┤
│ CHANNELS   │  # Staff General                    │
│            │  ─────────────────────────────────── │
│ # Staff    │  [message list with threads,         │
│   General  │   search, pins, read receipts]       │
│ # Admin    │                                      │
│   Only     │  ─────────────────────────────────── │
│            │  [composer bar]                      │
│ ───────    │                                      │
│ Online (3) │                                      │
└────────────┴─────────────────────────────────────┘
```

On mobile (< 768px), the channel sidebar becomes a top tab bar or sheet.

### Implementation Steps

**1. Create unified page `src/pages/admin/InternalMessages.tsx`**
- Holds state for `activeChannel: 'staff' | 'admin'`
- Renders a channel sidebar (desktop) or tab strip (mobile) on the left
- Renders `StaffChatRoom` on the right, passing the matching config
- Channel sidebar shows unread badges from existing `useChatNotifications`
- Admin-only channel hidden for non-admin staff (uses existing `view_admin_chat` permission check)
- Online presence indicators pulled from existing `useChatPresence`

**2. Update routing (`AppRoutes.tsx`)**
- New route: `/admin/messages`
- Legacy redirects: `/admin/staff-messages` → `/admin/messages?channel=staff`, `/admin/admin-chat` → `/admin/messages?channel=admin`

**3. Update sidebar (`AdminSidebar.tsx`)**
- Replace the two separate "Staff Messages" and "Admin Chat" entries with a single "Messages" entry pointing to `/admin/messages`
- Merge notification badges (show dot if either channel has unread)

**4. Update `AdminLayout.tsx` isChatPage detection**
- Add `/admin/messages` to the chat-page path list for keyboard-safe layout

**5. Delete old pages**
- Remove `src/pages/admin/AdminChat.tsx`
- Remove `src/pages/admin/StaffMessages.tsx`

**6. Update Dashboard quick links**
- Change the "Staff Chat" card on the admin dashboard to point to `/admin/messages`

### Technical Details

- No database changes needed — both tables (`staff_chat_messages`, `admin_chat_messages`) and their RLS policies remain intact
- The `StaffChatRoom` component is already fully config-driven; switching channels just swaps the `ChatRoomConfig` prop
- `fetchMembers` functions from the deleted pages move into the new unified page
- Channel switching preserves scroll position per-channel using a ref map
- Mobile: channel selector renders as a compact pill/tab bar above the chat area (not a sidebar) to maximize vertical space for keyboard

