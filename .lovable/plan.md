

# Sidebar Overhaul — Hamburger-Triggered Drawer (ClearlyDev Pattern)

## Current State
The platform has a **persistent desktop sidebar** (w-56, sticky left) that takes up permanent screen real estate, plus a mobile drawer. This is a traditional dashboard pattern but not how modern enterprise marketplaces (ClearlyDev, Stripe, Linear) work — they maximize content area and use the header as the primary navigation anchor.

## New Pattern
Remove the always-visible desktop sidebar entirely. On **all devices**, the sidebar is hidden by default and opens as a **drawer overlay** when the user clicks a hamburger menu icon in the header. This matches ClearlyDev's approach and gives 100% of the viewport to content.

```text
BEFORE (desktop):
┌──────────┬────────────────────────────────┐
│ Sidebar  │  Header                        │
│ (w-56)   │  ─────────────────────────────  │
│          │  Content                        │
│          │                                 │
└──────────┴────────────────────────────────┘

AFTER (all devices):
┌──────────────────────────────────────────┐
│  ☰  Logo  Search          Cart  User     │
│  ────────────────────────────────────────│
│  Content (full width)                    │
│                                          │
└──────────────────────────────────────────┘
  ↓ Click ☰
┌─────────┬────────────────────────────────┐
│ Drawer  │  (dimmed content)              │
│ overlay │                                │
│         │                                │
└─────────┴────────────────────────────────┘
```

## Changes

### 1. `src/components/layout/MainLayout.tsx`
- Remove `collapsed` state and `COLLAPSE_KEY` localStorage logic entirely
- Remove `desktopSidebar` prop — pass `null` or empty fragment
- The sidebar is now **only** rendered via `mobileSidebar` (the Sheet drawer), which LayoutShell already supports on all breakpoints
- Pass `CustomerSidebar` in the `mobileSidebar` prop only (always expanded, never collapsed)

### 2. `src/components/layout/LayoutShell.tsx`
- Change the desktop sidebar wrapper from `hidden lg:block` to fully hidden (or remove it)
- The `Sheet` drawer now works on **all** breakpoints (remove `md:hidden` / `lg:hidden` constraints if any)
- The hamburger button in the Header triggers `setMobileOpen(true)` on all devices

### 3. `src/components/layout/Header.tsx`
- **Desktop row**: Add a hamburger `Menu` icon button on the left (before the logo), matching the mobile pattern. This calls `onMenuClick` to open the drawer
- Remove the `hidden md:hidden` constraint — hamburger is always visible
- The desktop header already has Logo, Search, Cart, User — just add the hamburger

### 4. `src/components/layout/CustomerSidebar.tsx`
- Remove all `collapsed` state logic — the sidebar is always shown fully expanded (it's only ever inside a drawer now)
- Remove `ChevronLeft`/`ChevronRight` toggle button
- Remove collapsed icon-only rendering paths and tooltip menus
- Simplify props: remove `collapsed` and `onToggle`, keep `onNavigate` and `isMobileDrawer` (which is now always true)
- Keep all navigation groups, profile section, sign-out footer as-is

### 5. `src/components/layout/sidebar/sidebarConstants.ts`
- Remove `SIDEBAR_STORAGE_KEY` if it only served collapse state

### 6. Global Guard Layout (`src/components/global-guard/GlobalGuardLayout.tsx`)
- Already uses a drawer pattern on mobile — apply the same hamburger-only pattern on desktop (remove the persistent `md:flex` sidebar, add hamburger to desktop header)

## What stays unchanged
- All sidebar navigation content (groups, links, profile, seller CTA)
- Mobile bottom tab bar
- Edge swipe gesture to open drawer
- Footer, FABs, search palette
- Admin layout (separate concern, already has its own sidebar)
- Store layout / StoreSidebar

## Summary
5 files modified, 0 new files. The sidebar becomes a drawer-only overlay triggered by a hamburger in the header on all devices. Content gets full viewport width. The collapsed sidebar state and localStorage persistence are removed entirely.

