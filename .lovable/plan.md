
## Fix: Chat Scrolling and Role Badge Display

### Issues Identified

**1. Scrolling broken on mobile**
The `LayoutShell` inner container (line 103) uses `md:h-[100dvh]` which only applies on desktop. On mobile, there is no height constraint, so the chat content grows infinitely instead of creating a scrollable area. The `overflow-y-auto` on the messages div has no effect because no ancestor constrains the height on mobile.

**Fix**: For chat pages, the wrapper already sets `overflow-hidden`, but the inner flex container needs `h-[100dvh]` applied on all viewports, not just `md:`. This will be done by adjusting the `wrapperClassName` in `AdminLayout.tsx` to include an explicit height on chat pages.

**2. Role badges not updating after custom_roles load**
In both `AdminChat.tsx` and `StaffMessages.tsx`, the `userRoles` query calls `getBestRole(roles)` inside its `queryFn`. However, `getBestRole` depends on the `customRoles` data from the `useChatRoles` hook. The problem is the query key (`['admin-chat-roles', userIds]`) does not include any reference to `customRoles`, so when `customRoles` finishes loading, the cached query result with empty role mappings is never invalidated.

**Fix**: Add `rolePriority` (derived from `customRoles`) to the query keys for both chat role queries so they re-compute when the role definitions load.

### Changes

**`src/components/admin/AdminLayout.tsx`**
- Change the `wrapperClassName` for chat pages to include `h-[100dvh]` so the flex container is height-constrained on all viewports.

**`src/pages/admin/AdminChat.tsx`**
- Add `rolePriority` to the `userRoles` query key so it re-runs when custom roles load.

**`src/pages/admin/StaffMessages.tsx`**
- Same fix: add `rolePriority` to the `userRoles` query key.
