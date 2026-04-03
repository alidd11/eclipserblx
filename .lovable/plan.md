

# Sidebar User Card & CTA (BoostEXA-inspired)

Add a user profile card and prominent CTA button to the Eclipse sidebar, positioned between the branded header and the navigation groups.

## What's Being Added

**User card** (below header, above nav):
- User avatar (first letter fallback, purple gradient background)
- Display name + plan label ("Eclipse+" or "FREE PLAN")
- Balance card showing wallet balance with "Add Funds" link → `/credits`
- Close/dismiss button on mobile drawer

**CTA button** (below user card):
- Large purple gradient "Start Selling" button (for non-sellers) or "Seller Dashboard" (for sellers)
- Lightning bolt icon, matches the BoostEXA "New Order" style
- Links to `/sell` or `/seller` based on seller status

**Collapsed state**: Card hides entirely; CTA becomes a small icon-only button with tooltip.

## Technical Details

### File: `src/components/layout/CustomerSidebar.tsx`
- Import `useCredits` for balance, `useAuth` for user info, `Zap` icon
- Add a `SidebarUserCard` section between the header `div` and the `<nav>` element
- User card renders conditionally when `user` is present and sidebar is expanded
- Balance displays with `£` prefix, "Add Funds" links to `/credits`
- CTA button uses `bg-gradient-to-r from-primary to-purple-500` styling
- On mobile drawer, show an `X` close button in the card header

### File: `src/components/layout/sidebar/SidebarFooter.tsx`
- No changes needed -- sign out stays in footer

