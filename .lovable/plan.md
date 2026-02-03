

# Force Sidebar Open on Desktop

## Overview
Remove the ability to collapse the sidebar on desktop devices, keeping it permanently expanded for better navigation visibility and a cleaner professional appearance similar to BuiltByBit and ClearlyDev.

---

## Design Decision

### Option A: Always Open (Recommended)
Force the sidebar to always be expanded on all desktop screen sizes (≥768px).
- Simpler implementation
- Consistent with reference sites

### Option B: Breakpoint-Based
- Always open on large screens (≥1280px)
- Collapsible on medium screens (768-1279px)
- More flexible but adds complexity

**This plan implements Option A** - forcing the sidebar permanently open on desktop.

---

## Changes Required

### 1. MainLayout.tsx
- Remove the `sidebarCollapsed` state for desktop
- Always pass `collapsed={false}` to `CustomerSidebar` on desktop
- Remove the localStorage persistence for desktop collapsed state
- Keep the Ctrl/Cmd+B shortcut (can either remove it or repurpose)
- Keep mobile drawer behavior unchanged

### 2. SellerLayout.tsx  
- Same changes as MainLayout
- Force `collapsed={false}` for desktop `SellerSidebar`
- Remove desktop collapse toggle functionality

### 3. CustomerSidebar.tsx
- Remove the collapse toggle button from the footer (desktop only)
- Since it's always expanded, no need for the toggle UI

### 4. SellerSidebar.tsx
- Remove the collapse toggle button from the footer (desktop only)

### 5. Header.tsx (if applicable)
- Remove or hide any desktop sidebar toggle button

---

## Technical Summary

```text
Before:
┌─────────────────────────────────────────────────┐
│ Desktop: Sidebar can be collapsed (w-14) or    │
│          expanded (w-64) based on user toggle   │
└─────────────────────────────────────────────────┘

After:
┌─────────────────────────────────────────────────┐
│ Desktop: Sidebar always expanded (w-64)         │
│ Mobile:  Sheet drawer behavior unchanged        │
└─────────────────────────────────────────────────┘
```

---

## Files to Modify
1. **src/components/layout/MainLayout.tsx** - Remove desktop collapse state
2. **src/components/seller/SellerLayout.tsx** - Remove desktop collapse state  
3. **src/components/layout/CustomerSidebar.tsx** - Remove collapse toggle button
4. **src/components/seller/SellerSidebar.tsx** - Remove collapse toggle button
5. **src/components/layout/Header.tsx** - Remove/hide desktop toggle if present

---

## What Stays the Same
- Mobile drawer slide-in behavior
- Edge swipe gesture to open mobile drawer
- All navigation items and groups
- Keyboard shortcut can be removed or kept for mobile

