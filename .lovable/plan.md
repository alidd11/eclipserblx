

## Seller Dashboard Review and Improvements

After reviewing all 15+ dashboard components, here are the issues found and proposed improvements:

### Problems Found

1. **Duplicate data fetching** — `SellerHeroBanner` and `RevenueSummaryStats` both independently query `seller_transactions` for this month vs last month revenue. Two separate network requests for the same data.

2. **Redundant stats displayed** — The hero banner shows "Total Revenue", "Available Balance", "This Month", and "Followers". Then `RevenueSummaryStats` immediately below shows "Today's Revenue", "This Month", "Monthly Orders", and "All-Time Revenue". "This Month" revenue appears twice; "Total Revenue" and "All-Time Revenue" are the same thing.

3. **NotificationCenter fires 4 parallel queries** (orders, reviews, payouts, messages) instead of using the existing `seller_notifications` table.

4. **Unused import** — `Plus` is imported but never used in `SellerDashboard.tsx`.

5. **No "View All" links** on Recent Orders or Top Products cards, making them dead-ends.

6. **Dashboard is excessively long** — 11+ widget sections create an overwhelming scroll, especially on mobile. Lower-value widgets (StorePreviewCard, ProductPerformanceComparison, CustomerDemographics) push important content far down.

7. **Mobile stat cards lack horizontal scroll indicators** — the `RevenueSummaryStats` scrolls horizontally on mobile but gives no visual hint.

### Proposed Changes

**A. Remove duplicate hero stats row**
- Remove the 4 stat boxes from `SellerHeroBanner` (Total Revenue, Available Balance, This Month, Followers) since `RevenueSummaryStats` already covers this better with change indicators.
- Remove the separate `seller-revenue-trend` query from `SellerHeroBanner` — saves 2 API calls.
- Keep the hero banner as a clean greeting + store branding + store link + "Add Product" CTA only.

**B. Enhance RevenueSummaryStats**
- Add "Available Balance" as a 5th stat (or replace "All-Time Revenue" since it's visible on the hero) to fill the gap from removing it from the hero.
- Add the follower count as context in the hero subtitle instead.

**C. Simplify NotificationCenter**
- Query from the `seller_notifications` table (which already exists and receives inserts from triggers) instead of assembling notifications from 4 separate tables.

**D. Add "View All" links**
- Add "View All" links to Recent Orders (→ `/seller/orders`) and Top Products (→ `/seller/products`).

**E. Consolidate bottom sections**
- Move StorePreviewCard into the hero banner as a "View Store" button (already has that link bar).
- Remove the standalone StorePreviewCard widget entirely.
- Move ProductPerformanceComparison behind a collapsible/accordion so it doesn't take permanent space.

**F. Minor cleanups**
- Remove unused `Plus` import.
- Add `snap-x` scroll hint styling to mobile stat cards.
- Ensure consistent `CardTitle` sizing (some use `text-lg`, others `text-base`).

### Files to Edit
- `src/components/seller/SellerHeroBanner.tsx` — strip stats row, remove trend query, add follower count to subtitle
- `src/components/seller/RevenueSummaryStats.tsx` — add available balance stat
- `src/components/seller/NotificationCenter.tsx` — use `seller_notifications` table
- `src/components/seller/RecentOrdersTable.tsx` — add "View All" link
- `src/components/seller/TopProductsLeaderboard.tsx` — add "View All" link
- `src/pages/seller/SellerDashboard.tsx` — remove StorePreviewCard, clean imports, reorder layout

