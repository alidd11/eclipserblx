

## Unified Layout System

### Problem

There are currently **two competing layout systems** in the app:

1. **`LayoutShell`** — Used by MainLayout, SellerLayout, StoreLayout, IPShieldLayout, IPStaffLayout. Provides consistent sidebar/header/main structure with built-in overflow protection.
2. **`AdminLayout`** — A completely separate 500-line implementation with its own sidebar drawer, header, swipe handling, and overflow logic. This is the main source of inconsistency and recurring horizontal scroll bugs.

Additionally, individual pages (ProductDetail, Checkout) apply their own `overflow-x-hidden` classes ad-hoc, creating a patchwork of fixes rather than one enforced system.

### Solution

Migrate **AdminLayout** to use `LayoutShell`, matching how every other layout in the app works. Then enforce overflow containment at the shell level so no individual page needs to worry about it.

### Changes

**1. Refactor AdminLayout to use LayoutShell** (`src/components/admin/AdminLayout.tsx`)
- Replace the custom 500-line layout with a call to `LayoutShell`, matching the pattern in SellerLayout/IPShieldLayout
- Move the AdminSidebar into `desktopSidebar` / `mobileSidebar` props
- Keep the chat-page special casing via `wrapperClassName` / `mainClassName` (same approach as SellerLayout)
- Keep the admin-specific logic (auth checks, hub detection, AdminInstallPrompt) — just remove the duplicated structural HTML
- Remove the custom Sheet, swipe indicator, and mobile header since LayoutShell + Header already provide these

**2. Harden LayoutShell overflow containment** (`src/components/layout/LayoutShell.tsx`)
- Add `max-w-full min-w-0` to the default `wrapperClassName` and `mainClassName`
- This ensures all layouts automatically clip horizontal overflow without pages needing to opt in

**3. Remove ad-hoc overflow-x-hidden from pages** (`src/pages/ProductDetail.tsx`, `src/pages/Checkout.tsx`)
- Strip the redundant `overflow-x-hidden max-w-full` classes from page containers since the shell now handles it

### What stays the same
- All auth/permission checks in AdminLayout
- Hub detection (`isInsideHub