

## Problem Analysis

Both `StaffMessages.tsx` (1,136 lines) and `AdminChat.tsx` (1,268 lines) are monolithic files with **~90% duplicated code**. They share identical logic for:
- Message rendering (bubbles, grouping, avatars, role badges)
- Mention parsing, filtering, insertion, and keyboard navigation
- File upload with security scanning
- Typing indicators via Supabase Presence
- Realtime subscriptions for messages and reactions
- iOS PWA keyboard workarounds (staggered scroll timeouts, visual viewport listeners)
- Input bar UI (iMessage-style pill with plus button)

Every time a bug or layout issue is fixed in one, the other drifts. The staggered `setTimeout` scroll hacks (5 timers at 0/100/200/350/500ms) are fragile and cause the recurring blank-space and input-jumping issues.

---

## Plan: Extract a Shared `StaffChatRoom` Component

### Architecture

```text
src/components/chat/
  StaffChatRoom.tsx       ← NEW: shared UI shell (header, messages, input bar)
  useChatMessages.ts      ← NEW: hook for fetch, realtime, send, delete, reactions
  useChatMentions.ts      ← NEW: hook for mention detection, filtering, insertion
  useChatPresence.ts      ← NEW: hook for typing indicators + online presence
  useChatScroll.ts        ← NEW: hook replacing all staggered setTimeout hacks
  chatHelpers.ts          ← NEW: shared utils (parseMentions, renderMessageWithMentions, isImageUrl, getFileName, getMentionHandle)
  AttachmentDisplay.tsx   (existing)

src/pages/admin/
  StaffMessages.tsx       ← REWRITE: ~30 lines, passes config to StaffChatRoom
  AdminChat.tsx           ← REWRITE: ~40 lines, passes config to StaffChatRoom
```

### 1. `chatHelpers.ts` -- shared utilities

Extract these duplicated functions (currently copy-pasted in both files):
- `isImageUrl`, `getFileName`
- `parseMentions`, `getMentionHandle`, `matchesMention`
- `renderMessageWithMentions`
- `GROUP_MENTIONS` constant

### 2. `useChatScroll.ts` -- replace fragile scroll hacks

Replace the 5x staggered `setTimeout` pattern with a single `MutationObserver` on the scroll container that auto-scrolls when children change. Add a `ResizeObserver` for visual viewport changes instead of raw event listeners. This eliminates the timing-dependent scroll bugs entirely.

### 3. `useChatMessages.ts` -- data hook

Parameterized hook accepting:
- `table`: `'staff_chat_messages'` | `'admin_chat_messages'`
- `reactionsTable`: `'staff_chat_reactions'` | `'admin_chat_reactions'`
- `storageBucket`: `'staff-chat-attachments'` | `'admin-chat-attachments'`
- `channelName`: string
- `enabled`: boolean

Returns: `messages`, `profiles`, `userRoles`, `reactions`, `sendMessage`, `deleteMessage`, `addReaction`, `removeReaction`, `isLoading`, `isUploading`.

### 4. `useChatMentions.ts` -- mention logic hook

Encapsulates mention filter state, suggestion list computation, keyboard navigation (ArrowUp/Down/Enter/Tab/Escape), and the `insertMention` helper. Returns props to spread on the input and the suggestion list JSX.

### 5. `useChatPresence.ts` -- typing + online

Parameterized hook accepting a channel name. Manages presence tracking and returns `typingUsers` and `onlineUsers`.

### 6. `StaffChatRoom.tsx` -- shared UI component

A single presentational component that composes the above hooks. Accepts a config object:

```typescript
interface ChatRoomConfig {
  table: string;
  reactionsTable: string;
  storageBucket: string;
  channelPrefix: string;
  headerTitle: string;
  readChannel: string;           // for markChatAsRead
  mentionSource: 'staff' | 'admin';
  fetchMembers: () => Promise<Member[]>;
}
```

Renders:
- Header with EclipseLogo + title
- Message list with grouping, bubbles, role badges, attachments, reactions
- Typing indicator
- Reply/file preview bars
- iMessage-style input with mention suggestions

### 7. Page files become thin wrappers

**`StaffMessages.tsx`** (~30 lines):
```typescript
export default function StaffMessages() {
  return (
    <AdminLayout>
      <StaffChatRoom config={STAFF_CHAT_CONFIG} />
    </AdminLayout>
  );
}
```

**`AdminChat.tsx`** (~40 lines):
```typescript
export default function AdminChat() {
  // permission check stays here
  if (!canAccessAdminChat) return <Navigate to="/admin" />;
  return (
    <AdminLayout requiredPermissions={['view_admin_chat']}>
      <StaffChatRoom config={ADMIN_CHAT_CONFIG} />
    </AdminLayout>
  );
}
```

### 8. Scroll fix details

The current approach uses 4-5 staggered `setTimeout(scrollToBottom, N)` calls on every message change, mention open, and focus event. This is replaced with:

- A `MutationObserver` on the scroll container's `childList`/`subtree` that calls `scrollToBottom` once after mutations settle (via `requestAnimationFrame`).
- A single `visualViewport.resize` listener with a 100ms debounce (no staggering).
- On input focus: one `requestAnimationFrame` + one 200ms fallback (2 calls max, not 4-5).

This eliminates the timing race conditions that cause blank space and input jumping on iOS.

### Impact

- Combined line count drops from ~2,400 to ~800 (shared component + 2 thin pages).
- Future chat fixes apply to both pages automatically.
- Scroll behavior becomes deterministic instead of timing-dependent.
- No functional changes to features (mentions, reactions, replies, attachments, drag-drop all preserved).

