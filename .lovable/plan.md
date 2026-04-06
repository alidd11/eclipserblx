

# Admin Sidebar — Enterprise Polish

## Current State
The admin sidebar is functional but has visual inconsistencies compared to the seller sidebar's more polished patterns:
- Active state uses a filled `bg-primary` block (heavy, draws too much attention)
- Group headers include an icon (adds visual noise unlike the seller sidebar which omits them)
- No left-border active indicator (seller sidebar uses `border-l-2 border-primary` which is cleaner)
- Collapsible content uses `border-l` indent — good, but styling differs from seller
- Header lacks subtitle branding treatment (seller uses uppercase tracking-wider label)
- Sign out button placement inconsistent between mobile/desktop

## Plan

### 1. Unify active state to left-border indicator
Replace the heavy `bg-primary text-primary-foreground` active style with the seller pattern: `border-l-2 border-primary bg-muted/60 text-foreground !rounded-l-none` — subtler, more professional.

### 2. Clean up group headers
Remove group icons from collapsible triggers (seller sidebar omits them). Keep just the uppercase label + chevron for a cleaner typographic hierarchy.

### 3. Refine header branding
Update the "Admin Dashboard" subtitle to match seller's uppercase tracking-wider style (`text-[10px] text-primary/70 font-semibold uppercase tracking-wider`).

### 4. Standardise nav item sizing
Align padding and font sizing with seller sidebar (`py-1.5`, `stroke-[2.25]` for active icons, `stroke-[1.75]` for inactive).

### 5. Consolidate sign out placement
Move sign out into the header row (next to logo) matching seller pattern, remove the separate footer sign-out section on desktop.

### 6. Remove collapse toggle
Per the drawer-navigation architecture memory, persistent desktop sidebars are removed — the collapse/expand button in the footer is legacy. Remove it.

### Technical Details

**File:** `src/components/admin/AdminSidebar.tsx`
- `renderNavItem`: Change active class from `bg-primary text-primary-foreground shadow-sm` → `border-l-2 border-primary bg-muted/60 text-foreground !rounded-l-none pl-[calc(0.625rem-2px)]`
- `renderNavItem`: Add `stroke-[2.25]`/`stroke-[1.75]` to icon styling
- `renderGroup`: Remove `<group.icon>` from CollapsibleTrigger, remove icon className
- Header: Add `text-[10px] text-primary/70 font-semibold uppercase tracking-wider` to subtitle
- Header: Add sign-out icon button inline with logo (matching seller)
- Footer: Remove collapse toggle button and desktop sign-out section entirely
- Collapsible content: Change from `ml-[13px] border-l border-border/40 pl-2` → `ml-3 space-y-px pt-px pb-0.5` (matching seller)

