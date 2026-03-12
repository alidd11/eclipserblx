

## Issues Identified

**Issue 1: Sidebar positioned at top of screen on desktop**
The sidebar currently uses `sticky top-0 h-[100dvh]` — this means it sticks to the very top of the viewport, sitting flush against the top edge above the header. The user wants it to feel more integrated, not dominating the top. Looking at the reference screenshot, the sidebar is correctly at the top (which is standard) — but the real frustration is likely that the header row spans the full width while the sidebar also starts from the top, creating a visual clash. The sidebar sits beside the header, which makes the ECLIPSE brand title compete with the header bar.

**Issue 2: Excessive black empty space in the content area**
The categories grid uses `max-w-6xl` (~72rem / 1152px) centered in the content area. With the sidebar taking ~208px (w-52), the remaining space is constrained, but the `max-w-6xl` still leaves significant padding/gutters on wider screens. The cards themselves have dark backgrounds that blend into the dark page, creating a "sea of black" effect. There's also a lot of vertical space between the page header and the first card row.

## Plan

### 1. Widen the content area on the Categories page
- Change `max-w-6xl` to `max-w-7xl` to fill more of the available space
- Reduce vertical padding between the header and grid
- Tighten the gap between the page title/description and the cards

### 2. Improve the PageHeader component
- Reduce bottom margin from `mb-5 sm:mb-8` to `mb-4 sm:mb-6` to close the gap
- This applies globally to all pages using PageHeader

### 3. Make category cards fill space better
- Increase card hero height on large screens: `lg:h-56` instead of `lg:h-52`
- Add subtle card background to differentiate from the page background (e.g., `bg-card` with visible border)
- Reduce grid gap slightly so cards feel more connected

### 4. Sidebar desktop alignment fix
- The sidebar already uses `sticky top-0` which is correct for sidebar behavior
- The actual issue is that the sidebar header ("ECLIPSE" brand) duplicates the header bar identity — the sidebar starts at the viewport top while the header also shows the logo
- Solution: On desktop, add a small top padding or visual separator so the sidebar feels subordinate to the header, not competing. Alternatively, reduce the sidebar header padding to be more compact.

### Files to modify
- `src/pages/Categories.tsx` — widen container, tighten spacing
- `src/components/ui/PageHeader.tsx` — reduce bottom margin
- `src/components/layout/CustomerSidebar.tsx` — compact the sidebar header area

