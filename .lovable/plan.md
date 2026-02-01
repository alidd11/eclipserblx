

# Unified Store Sidebar Plan

## Overview
Transform the Store Sidebar (`StoreSidebar.tsx`) to match the structure and styling of the main marketplace sidebar (`CustomerSidebar.tsx`), creating a seamless and consistent navigation experience across the entire platform - similar to ClearlyDev and BuiltByBit.

## Current State Analysis

### CustomerSidebar (Main Marketplace)
- Collapsible groups with chevron toggles
- Unified icon sizing constants (`ICON_SIZE`, `ICON_STROKE_ACTIVE`, etc.)
- Collapsible sections with persistent state (localStorage)
- Desktop collapse/expand functionality with Ctrl+B shortcut
- Tooltip support for collapsed mode
- Haptic feedback on interactions
- System status integration
- Recent/Followed stores sections

### StoreSidebar (Current)
- Simple flat list with separators
- Button-based navigation items
- No collapsible sections
- No collapse/expand state
- Inconsistent icon sizing
- Store-accent colored icons
- Fixed "Powered by Eclipse" footer

## Implementation Plan

### 1. Adopt Unified Styling Constants
Add the same icon sizing and stroke constants used in CustomerSidebar:
```tsx
const ICON_SIZE = "h-[1.125rem] w-[1.125rem]";
const ICON_SIZE_SMALL = "h-4 w-4";
const ICON_STROKE_ACTIVE = "stroke-[2.25]";
const ICON_STROKE_DEFAULT = "stroke-[1.75]";
```

### 2. Convert to Collapsible Group Structure
Reorganize navigation into collapsible groups:

**Quick Access** (non-collapsible, top-level)
- Back to Marketplace
- Store Home
- About

**My Account** (collapsible)
- Profile
- My Cart
- Wishlist
- Purchases

**Store** (collapsible)
- Recommended (scroll anchor)
- Reviews (scroll anchor with rating badge)

**Browse** (collapsible)
- All Products (with count badge)
- [Dynamic store categories/tabs]

**Legal** (collapsible)
- Terms of Service
- Privacy Policy
- Refund Policy

### 3. Add Collapse/Expand Support
- Add `collapsed` prop support to StoreSidebar
- Implement tooltip mode for collapsed state
- Persist collapse state via localStorage
- Support Ctrl+B keyboard shortcut (already in StoreLayout)

### 4. Unify Component Structure
- Use NavLink instead of Button for internal links
- Apply identical `renderNavItem` and `renderGroup` patterns
- Match padding, spacing, and transitions exactly
- Use Collapsible components from radix-ui

### 5. Remove Store-Specific Styling
- Remove accent-colored icons (use neutral theme tokens)
- Remove "Powered by Eclipse" footer (platform branding handled by Header)
- Remove store-specific visual customizations for sidebar

### 6. Update StoreLayout Integration
- Pass `collapsed` state to StoreSidebar
- Add collapse toggle button in sidebar header
- Synchronize mobile drawer behavior

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/store/StoreSidebar.tsx` | Complete rewrite using CustomerSidebar patterns |
| `src/components/store/StoreLayout.tsx` | Add sidebar collapse state management |

## Visual Architecture

```text
+----------------------------------+
| [Eclipse Logo]      [Collapse ▼] |  <- Unified header with toggle
+----------------------------------+
| ◀ Back to Marketplace            |  <- Quick Access (always visible)
| 🏠 Store Home                    |
| ℹ️ About                          |
+----------------------------------+
| ▼ MY ACCOUNT                     |  <- Collapsible group
|   👤 Profile                     |
|   🛒 My Cart                     |
|   ❤️ Wishlist                    |
|   📦 My Purchases                |
+----------------------------------+
| ▼ STORE                          |  <- Collapsible group
|   ✨ Recommended                 |
|   ⭐ Reviews          4.8        |  <- Rating badge
+----------------------------------+
| ▼ BROWSE                         |  <- Collapsible group
|   📦 All Products     12         |  <- Product count badge
|   📁 Category 1                  |
|   📁 Category 2                  |
+----------------------------------+
| ▼ LEGAL                          |  <- Collapsible group
|   📄 Terms of Service            |
|   🛡️ Privacy Policy              |
|   🔄 Refund Policy               |
+----------------------------------+
```

## Technical Details

### Props Interface Update
```tsx
interface StoreSidebarProps {
  storeSlug: string;
  storeName: string;
  tabs?: StoreTab[];
  activeTab: string | null;
  onTabChange: (tabSlug: string | null) => void;
  onNavigate?: () => void;
  productCount?: number;
  averageRating?: number | null;
  // New unified props:
  collapsed: boolean;
  onToggle: () => void;
  isMobileDrawer?: boolean;
}
```

### Removed Props
- `accentColor` - No longer using store-specific accent colors in sidebar
- `totalSales` - Not displayed in unified sidebar
- `bio` - Not displayed in sidebar

### State Management
- Collapse state managed in StoreLayout
- Group open/close state persisted to localStorage with key `store-sidebar-groups`
- Synchronized with CustomerSidebar behavior

## Expected Outcome
The store sidebar will be visually indistinguishable from the main marketplace sidebar in terms of:
- Typography and spacing
- Icon sizing and stroke weights
- Collapsible group behavior
- Hover/active states
- Collapse/expand animations
- Mobile drawer appearance

This creates the unified "platform feel" seen on ClearlyDev and BuiltByBit where all sidebars share the same visual language.

