

## Fix: Chat Pages — Blank Space at Top + No Scrolling

### Root Causes

**1. Blank space at top (screenshot issue)**
In `AdminLayout.tsx`, the `contentClassName` for chat pages includes `pt-[env(safe-area-inset-top)]`. But the custom header already applies `pt-[calc(env(safe-area-inset-top)+0.5rem)]`. This double-applies the safe area inset, creating the large blank gap between the "Admin Dashboard" header and the "Admin Chat" sub-header.

**2. Messages can't scroll**
The `<main>` element for chat pages has `mainClassName = "flex-1 overflow-y-hidden ..."` but it is **not a flex container** (no `flex flex-col`). The child `<div className={contentClassName}>` uses `flex-1` to fill remaining space, but `flex-1` only works inside a flex parent. Without it, `<main>` renders at its natural content height, and the `overflow-y-auto` on the messages container never activates because no ancestor properly constrains the height.

### Changes

**`src/components/admin/AdminLayout.tsx`** (2 lines)

1. **`mainClassName`** for chat pages: Add `flex flex-col` so child containers can use `flex-1` to fill remaining height.
   - From: `'overflow-y-hidden'`
   - To: `'overflow-y-hidden flex flex-col'`

2. **`contentClassName`** for chat pages: Remove `pt-[env(safe-area-inset-top)]` since the header already handles it.
   - From: `'flex-1 flex flex-col min-h-0 p-0 pt-[env(safe-area-inset-top)]'`
   - To: `'flex-1 flex flex-col min-h-0 p-0'`

