

## Consistent Mobile Dropdowns — One-Line Layout

### Problem
On mobile, hub tab selectors and page filter dropdowns (e.g. "Seller Payouts" + "Pending") stack vertically, each taking a full line. This wastes space and looks inconsistent across pages.

### Solution
1. **Hub tab selectors**: Keep as full-width on mobile (these are the primary navigation for the page — they should be prominent).

2. **Filter dropdowns inside hub child pages**: When a child page renders inside a hub, its filter dropdown(s) should sit on the same line as the hub tab selector. We do this by making the filter row use `flex` with `items-center gap-3` and ensuring filter selects use a compact width (`w-auto min-w-[120px]`) instead of fixed `w-48`.

3. **Standalone pages with header + filter**: Ensure the header and filter are on one row via `flex items-center justify-between`.

### Files to Update

**Hub pages** — wrap the mobile tab selector `<div className="sm:hidden">` to allow inline filters:
- `PayoutsHub.tsx` — no change needed (tab selector only, filter is in child)
- `DisputesRefundsHub.tsx` — same pattern
- `AffiliateHub.tsx` — same pattern
- `RevenueHub.tsx` — same pattern
- `SellerFinanceHub.tsx` — same pattern

**Child/standalone pages with filter selects** — make filter row compact and inline:
1. `SellerPayouts.tsx` — change `<div className="flex items-center justify-end">` + `w-48` trigger to `w-auto min-w-[140px]`
2. `IPReports.tsx` — header + filter already in a flex row; make `w-48` → `w-auto min-w-[140px]`  
3. `SellerProductReview.tsx` — same pattern
4. `SellerProductsAll.tsx` — has multiple filters in a row; make `w-48` → `w-auto min-w-[140px]`
5. `SellerTickets.tsx` — filter row; same fix
6. `SellerRefunds.tsx` — filter; same fix
7. `Analytics.tsx` — mobile tab dropdown
8. `RobloxSettings.tsx` — mobile tab dropdown

### Specific Changes

**Pattern for filter `SelectTrigger`s:**
```
Before: className="w-48"
After:  className="w-auto min-w-[140px]"
```

**Pattern for hub mobile tab selectors** (currently each takes full width on its own line):
No structural change needed — the tab selector is intentionally full-width as it's the primary nav. The issue in the screenshot is the child page's filter also being full-width below it.

**SellerPayouts.tsx line 204-218** — the filter wrapper `<div className="flex items-center justify-end">` stays, but the trigger gets `w-auto min-w-[140px]` so it doesn't stretch unnecessarily.

For pages where **both** a hub tab selector AND a filter appear on mobile, we'll keep them stacked but make each compact (not full-width), so they don't dominate.

### Summary
~8 files updated, all select triggers changed from fixed `w-48` to `w-auto min-w-[140px]`, ensuring dropdowns are compact and don't dominate the mobile viewport.

