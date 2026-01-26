
# Remove Sidebar Border and Extend Eclipse Branding

## Overview

You want to remove the vertical line (right border) from the sidebar and have the Eclipse logo/text visually extend across the sidebar header area, creating a seamless look similar to ClearlyDev.

## Technical Changes

### 1. Remove Vertical Border from Sidebar

**File: `src/components/layout/CustomerSidebar.tsx`**

Remove the `border-r border-border` class from the sidebar container:

```tsx
// Line 882 - Current:
!isMobileDrawer && "border-r border-border",

// Updated:
// Remove this line entirely (or replace with empty string)
```

### 2. Restore Eclipse Branding to Sidebar Header

**File: `src/components/layout/CustomerSidebar.tsx`**

Replace the empty spacer div with the logo and site name that fills the header area:

```tsx
// Lines 888-889 - Current:
{/* Header spacer - matches header height for alignment */}
<div className="h-14 sm:h-16 shrink-0" />

// Updated:
{/* Header with branding */}
<div className="h-14 sm:h-16 flex items-center px-4 shrink-0">
  <Link to="/" className="flex items-center gap-3" onClick={handleNavClick}>
    <EclipseLogo size="sm" />
    {!isCollapsed && (
      <span className="brand-text text-base gradient-text">
        {SITE_NAME}
      </span>
    )}
  </Link>
</div>
```

### 3. Remove Duplicate Branding from Header

**File: `src/components/layout/Header.tsx`**

Remove the logo and site name from the desktop center section (since it's now in the sidebar):

```tsx
// Lines 121-133 - Current:
<div className="hidden md:flex items-center gap-4 flex-1">
  {/* Website name - separates sidebar from search */}
  <Link to="/" className="flex items-center gap-2.5 shrink-0">
    <EclipseLogo size="sm" />
    <span className="brand-text text-base gradient-text">
      {SITE_NAME}
    </span>
  </Link>
  
  <HeaderSearchBar className="flex-1 max-w-xl" />
  <CurrencySelector />
</div>

// Updated:
<div className="hidden md:flex items-center gap-4 flex-1">
  <HeaderSearchBar className="flex-1 max-w-xl" />
  <CurrencySelector />
</div>
```

## Visual Result

| Element | Before | After |
|---------|--------|-------|
| Sidebar right edge | Visible vertical line | No border, seamless |
| Sidebar header | Empty spacer | Eclipse logo + "Eclipse" text |
| Main header | Logo + Search bar | Search bar only |
| Collapsed sidebar | Empty header | Logo only (text hidden) |

## Behavior Summary

- **Desktop expanded**: Eclipse logo and "Eclipse" text appear at the top-left of the sidebar, with the search bar starting immediately to the right
- **Desktop collapsed**: Only the Eclipse logo shows (text is hidden when `isCollapsed` is true)
- **Mobile**: The mobile header already shows the logo (unchanged), and the mobile drawer will show the full branding
- **No vertical line**: The sidebar flows seamlessly into the main content area
