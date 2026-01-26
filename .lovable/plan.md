
# Align Header Bottom Border with Sidebar

## Problem
The header's bottom border and the sidebar's header section border are at different heights, creating a visual disconnect. Looking at the current layout:

- **Sidebar header**: Has `border-b border-border` with `p-4` padding and safe area padding, making its total height variable
- **Main header**: Has `border-b border-border` with `h-14 sm:h-16` height

These don't align horizontally because the sidebar header section is taller due to padding differences.

## Solution
Synchronize the heights of both headers so their bottom borders align perfectly on desktop. This creates a clean, continuous visual line across the top of the application.

## Technical Changes

### File: `src/components/layout/CustomerSidebar.tsx`

**Change the sidebar header to match the main header height:**
- Replace the current padding-based height with a fixed height matching the main header (`h-14 sm:h-16`)
- Adjust internal layout to use flexbox centering instead of padding
- Keep the safe-area-inset-top for PWA compatibility by adding it to the overall height

```tsx
// Before (line 884)
<div className="p-4 border-b border-border pt-[max(1rem,env(safe-area-inset-top))]">

// After
<div className="h-14 sm:h-16 flex items-center px-4 border-b border-border mt-[env(safe-area-inset-top)]">
```

This ensures:
1. Both headers have identical heights (14/16 units)
2. The bottom borders align horizontally across the viewport
3. Safe area insets are preserved for PWA mode
4. Logo and branding remain properly centered

## Visual Result

```text
BEFORE (misaligned):
┌─────────────┬──────────────────────────────────┐
│  ECLIPSE    │   [Actions...]      Sign In      │
│             ├──────────────────────────────────┤ ← Header border higher
├─────────────┤                                  │ ← Sidebar border lower
│  Collapse   │                                  │
│  Home       │         Main Content             │

AFTER (aligned):
┌─────────────┬──────────────────────────────────┐
│  ECLIPSE    │   [Actions...]      Sign In      │
├─────────────┼──────────────────────────────────┤ ← Borders aligned
│  Collapse   │                                  │
│  Home       │         Main Content             │
```

## Benefits
1. **Clean visual flow** - Continuous horizontal line across the top
2. **Professional appearance** - Matching heights between sidebar and header
3. **No functional changes** - Only visual alignment adjustment
4. **PWA compatibility** - Safe area handling preserved
