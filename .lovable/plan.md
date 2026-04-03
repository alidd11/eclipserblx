

# Account Page Revamp

## Current Problems
- 1000-line monolith file with inline components (`UserIdsSection`, `StatusBadgesSection`)
- Stats shown twice (quick stats bar in profile card + `AccountStatsBar` below)
- Unbalanced tabs -- Security tab only has saved cards; Profile tab is overloaded with 6+ cards
- IDs section clutters the profile card with technical info most users never need
- Order history is fully rendered inline instead of linking to a dedicated page

## Design Approach (Roblox-inspired)

Replace the tab-based layout with a **single scrollable page of clearly separated sections**, each as a compact, tappable row/card that either expands inline or links to a detail page. Think of it as a native settings screen -- clean, scannable, zero clutter.

```text
┌─────────────────────────────┐
│  Avatar + Name + @username  │
│  Member since · Eclipse+    │
│  [Edit Profile]  [Sign Out] │
├─────────────────────────────┤
│  Quick Stats Row            │
│  Orders · Wallet · Alerts   │
├─────────────────────────────┤
│  ▸ My Purchases        →    │
│  ▸ Order History        →    │
│  ▸ Wallet & Credits     →    │
│  ▸ Wishlist             →    │
├─────────────────────────────┤
│  ▸ Linked Accounts      →    │
│  ▸ Saved Payment Methods →    │
│  ▸ Eclipse+ Subscription →   │
├─────────────────────────────┤
│  ▸ Theme                 →    │
│  ▸ Notifications         →    │
│  ▸ Email Preferences     →    │
│  ▸ Sound Effects         →    │
├─────────────────────────────┤
│  ▸ Become a Seller       →    │
│  ▸ Referrals             →    │
│  ▸ Affiliate Program     →    │
├─────────────────────────────┤
│  ▸ Your IDs (collapsible)    │
│  [Delete Account]            │
│  App version                 │
└─────────────────────────────┘
```

## Key Changes

### 1. Simplify profile header
- Keep avatar, display name (editable), @username, member since date, status badges
- Remove the 4-column quick-stats grid from inside the card; replace with a cleaner 3-stat row below

### 2. Replace tabs with section groups
- **Shopping** section: links to `/purchases`, `/account#orders`, `/credits`, `/wishlist`
- **Account** section: linked accounts (inline expandable), saved cards, Eclipse+ subscription
- **Preferences** section: theme, notifications, email, sound -- each as a link-style row
- **More** section: become seller, referrals, affiliate, IDs (collapsed by default)

### 3. Navigation rows instead of full card renders
- Each row is a `Link` or expandable accordion -- no heavy card components rendered on the main page
- Existing sub-components (`LinkedAccountsCard`, `ThemeSettingsCard`, etc.) remain but are rendered on expand or on their own routes

### 4. Remove redundancy
- Remove `AccountStatsBar` from the page (stats are in the header)
- Remove inline `UserIdsSection` -- move to a collapsible "Your IDs" row at the bottom
- Remove full order history render -- link to `/purchases` instead

### 5. Clean sign-out and danger zone
- Sign out button in profile header (already exists)
- Delete account at the very bottom, subtle, with existing dialog

## Files Modified
- `src/pages/Account.tsx` -- full rewrite with new layout structure
- Extract `UserIdsSection` and `StatusBadgesSection` into the file as smaller helpers (or remove `StatusBadgesSection` and inline badges into the header)

## Files NOT Modified
- All existing card components (`LinkedAccountsCard`, `ThemeSettingsCard`, etc.) stay as-is
- No new routes needed -- expandable sections handle inline content

