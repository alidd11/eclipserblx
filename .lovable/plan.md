

# Sidebar User Card Improvements

## Current State
The user card section shows: avatar (or initial fallback), display name, hardcoded "Free Plan" label, wallet balance with "Add Funds" link, and a CTA button (Start Selling / Seller Dashboard).

## Proposed Improvements

### 1. Show Real Plan Status
Replace the hardcoded "Free Plan" text with actual Eclipse+ membership status. Query the database for active subscriptions and show "Eclipse+" with a sparkle icon when active, or "Free Plan" with an "Upgrade" link when not.

### 2. Online Status Indicator
Add a small green dot on the avatar (bottom-right corner) to show online status, similar to Discord. This gives the sidebar a more social/app-like feel.

### 3. Username Below Display Name
Show the user's `@username` (from profiles table) in muted text below the display name, giving users identity context at a glance.

### 4. Quick Stats Row
Add a compact row below the balance showing key stats: number of orders and wishlist count as small icon+number pairs. Keeps users engaged without cluttering.

### 5. Upgrade CTA for Free Users
When the user is on the free plan, replace or supplement the "Start Selling" CTA with a subtle "Upgrade to Eclipse+" banner using a gradient background, making the upsell contextual rather than a separate page visit.

### 6. Avatar Ring for Premium Users
Eclipse+ subscribers get a purple gradient ring around their avatar, visually distinguishing premium members (similar to how Instagram shows story rings).

## Technical Details

### File: `src/components/layout/CustomerSidebar.tsx`
- Expand the profile query to also fetch `username` from profiles
- Add a subscription status query (or check if Eclipse+ subscription data exists -- may need a new table/column if none exists yet)
- Add online status dot overlay on avatar
- Add `@username` line below display name
- Add compact stats row (orders count, wishlist count) using small queries
- Conditionally show premium avatar ring
- Replace hardcoded "Free Plan" with dynamic label

### Database
- May need to check if an Eclipse+ subscription table exists; if not, we can still show "Free Plan" for now and add the subscription system later

### No new files needed
All changes are within the existing sidebar component and its profile query.

