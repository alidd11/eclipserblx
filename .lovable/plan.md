

# Footer — Enterprise Mobile Layout Fix

## Problem
On mobile the footer renders as a 2-column grid with large text and excessive spacing, making it look unprofessional. The "Popular Categories" column has 6 links stacking tall.

## Solution
Collapse the footer on mobile into a single-column inline flow where each section's links run horizontally (inline, separated by middots), drastically reducing vertical height. On desktop (sm+), keep the current 4-column grid.

## Changes

**`src/components/layout/Footer.tsx`**

1. Mobile layout (below `sm`): render each column as a compact block — heading on one line, links flowing inline horizontally with `·` separators, `text-[11px]` size
2. Desktop layout (`sm+`): keep existing 4-column vertical grid unchanged
3. Use a single responsive approach: `hidden sm:grid` for the desktop grid, `sm:hidden` for the mobile inline version
4. Tighten mobile padding to `py-4 px-4`
5. Bottom bar (copyright + trust signals) stays as-is — already handles responsive

This gives a tight, enterprise-grade single-screen footer on mobile without changing the desktop experience.

