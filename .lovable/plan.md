

## Plan: Horizontal-scroll stat cards on mobile/PWA

### Problem
On mobile, stat card grids stack into 2 columns (or even 1 column), dominating the viewport and pushing real content far down. The screenshot shows the Payouts page where the table is barely visible after stacked cards and filters.

### Solution
Apply the proven horizontal-scroll pattern already used on `SellerRefunds` and `IpBans`:

```text
Mobile:  [Card1] [Card2] [Card3] [Card4] →  (horizontal scroll, single row)
Desktop: |Card1|  |Card2|  |Card3|  |Card4|  (normal grid)
```

**Container pattern:**
```
flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-N md:overflow-visible
```

**Card pattern:** Add `min-w-[160px] flex-shrink-0 md:min-w-0` to each card.

### Files to update (~20 files)

**Seller pages:**
1. `RevenueSummaryStats.tsx` -- 4 stat cards
2. `SellerPromotions.tsx` -- 4 stat cards
3. `SellerReviews.tsx` -- 3 stat cards
4. `SellerRevenueBreakdown.tsx` -- 3 summary cards
5. `SellerTaxSummary.tsx` -- 4 summary cards

**Admin pages:**
6. `Refunds.tsx` -- 4 AdminStatCards
7. `BotCodes.tsx` -- 4 AdminStatCards
8. `CustomDomains.tsx` -- 4 stat cards
9. `SellerPayouts.tsx` -- 2 stat cards
10. `SellerAgreements.tsx` -- 3 stat cards
11. `AffiliateApplications.tsx` -- 2 stat cards
12. `Referrals.tsx` -- 4 stat cards
13. `Subscribers.tsx` -- 4 stat cards
14. `SellerTickets.tsx` -- 5 AdminStatCards
15. `Applications.tsx` -- 5 stat cards
16. `AdvertisementAnalytics.tsx` -- 2 rows of 4 AdminStatCards
17. `Affiliates.tsx` -- 5 AdminStatCards
18. `PlatformLedger.tsx` -- 5 summary cards
19. `StaffActivity.tsx` -- 5 AdminStatCards

**Account pages:**
20. `AdAnalyticsPage.tsx` -- 4 stat cards

### What stays unchanged
- Product grids (Featured, Categories, ProductDetail) -- these are browse layouts where 2-col mobile grid is correct
- Tables -- most already have `overflow-x-auto`
- Form grids inside dialogs/modals
- Pages that already use the horizontal scroll pattern (SellerRefunds, IpBans)

### Approach
Each file gets a one-line container class change + adding `min-w-[160px] flex-shrink-0 md:min-w-0` to child cards. For `AdminStatCard`, the min-width will be added via its `className` prop. No functional or logic changes.

