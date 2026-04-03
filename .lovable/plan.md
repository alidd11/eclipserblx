

# Customer Sidebar Improvements

## Current Problems
1. **Too many items** -- The "My Account" group has 6-8 items that duplicate what the revamped Account page now handles (cart, wishlist, purchases, wallet, following, notifications). Users can reach all of these from /account now.
2. **Resources section is over-nested** -- Three separate collapsible sub-groups (Roblox, Discord, Templates) inside a collapsible parent creates 4 levels of nesting. Most have only 1-2 items each.
3. **Redundant navigation** -- Cart, Wishlist, Purchases, and Wallet appear in both the sidebar and the Account page's navigation rows.
4. **638 lines** for a sidebar component -- heavy inline rendering logic with duplicated patterns for collapsed/expanded/mobile states.
5. **No visual personality** -- Plain text header ("ECLIPSE") with no icon or branding. Other dashboards (Bot, Guard) have branded headers with icons.

## Proposed Changes

### 1. Slim down "My Account" group
Since the Account page is now a central hub, reduce this group to just 3 items:
- **My Account** → `/account`
- **Notifications** → `/messages` (keep badge)
- **Cart** → `/cart` (keep for quick access)

Remove: Wishlist, Purchases, Wallet, Following -- all accessible from /account.

### 2. Flatten Resources into a single group
Replace the triple-nested Roblox/Discord/Templates collapsibles with a flat list:
- Roblox categories listed directly (no sub-collapsible)
- Discord Bots as a single item
- Templates as a single item

This eliminates 3 levels of nesting and ~100 lines of code.

### 3. Add branded header
Replace the plain "ECLIPSE" text with a small logo icon + "Eclipse" label, consistent with Bot Dashboard and Guard sidebar styling. Include a collapse toggle button.

### 4. Reorder groups for user intent
```text
Quick Access:  Home, Admin*, Seller*
My Account:    Account, Notifications, Cart
Explore:       All Products, Stores, Categories, Featured, Eclipse+
Resources:     [Roblox categories], Discord Bots, Templates
Support:       Help Center, My Tickets, FAQ, Discord, Jobs
```
Move "Advertise" from Explore into a standalone item or into Support (it's not an exploration action).

### 5. Clean up conditional items
- Seller Dashboard and Admin Dashboard stay in Quick Access (role-gated)
- Store Messages moves to the Seller Dashboard sidebar (not the customer sidebar)
- Affiliate link only shows if approved (already works, keep as-is but move to Account page)

## Files Modified
- `src/components/layout/CustomerSidebar.tsx` -- restructure nav groups, flatten Resources, slim Account group, add branded header
- `src/components/layout/sidebar/SidebarFooter.tsx` -- no changes needed

## Files NOT Modified
- Account page, other sidebars, bottom tab bar -- all stay as-is

