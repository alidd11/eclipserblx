

## Seller Dashboard Enterprise Visual & UX Audit

### Findings

After auditing all 48 seller pages and 35+ seller components, here are the issues:

---

### Issue 1: Card Components Still Used in 10 Dashboard Widgets

The project's enterprise standard (per memory) is flattened `div` containers with `border-border rounded-xl`, but these dashboard components still use Shadcn `<Card>`, `<CardHeader>`, `<CardContent>`, `<CardTitle>`:

| Component | Lines |
|-----------|-------|
| `RevenueChart.tsx` | 88 |
| `ProductHealthDonut.tsx` | 82 |
| `RecentOrdersTable.tsx` | 121 |
| `TopProductsLeaderboard.tsx` | 110 |
| `NotificationCenter.tsx` | 102 |
| `StoreHealthScore.tsx` | 221 |
| `StoreSetupChecklist.tsx` | 53 |
| `DashboardSkeletons.tsx` | 39 |
| `DashboardPlaceholders.tsx` | 41 (CardEmptyState h-[200px] hardcoded) |

**Fix**: Replace all `<Card>` with `<div className="rounded-xl border border-border/50 bg-card">`, `<CardHeader>` with a `div` header, `<CardContent>` with `<div className="p-4">`. Update `DashboardCardSkeleton` and `StatRowSkeleton` similarly.

---

### Issue 2: Card Components in 10+ Seller Pages

These pages import and use Card wrappers:

- `SellerBalance.tsx` (397 lines)
- `SellerGoals.tsx` (272 lines)
- `SellerAnalytics.tsx` (643 lines)
- `SellerTaxFeeSummary.tsx` (139 lines)
- `SellerRevenueBreakdown.tsx` (166 lines)
- `SellerCategories.tsx`
- `SellerStoreTabs.tsx`
- `SellerSettingsAppearance.tsx`
- `SellerLeakReports.tsx`
- `SellerTaxSummary.tsx`
- `SellerTransactionHistory.tsx`
- `SellerFlashSales.tsx`

**Fix**: Same Card-to-div migration across all pages.

---

### Issue 3: Unused Import in SellerDashboard.tsx

Line 9 imports `Card, CardContent, CardHeader, CardTitle` but **none are used** in the JSX — all dashboard sections either use flattened divs or delegate to child components. Dead import.

**Fix**: Remove the unused import.

---

### Issue 4: Duplicate "New Product" CTA

The dashboard has TWO "New Product" buttons visible simultaneously:
1. Inside `SellerHeroBanner` (line 87-90) — a primary button in the hero
2. Inside the Command Center grid (line 92) — "New Product" as the first action tile

**Fix**: Remove "New Product" from the Command Center `createActions` array since the hero banner already prominently features it.

---

### Issue 5: Duplicate Onboarding Components

Three onboarding/setup components render sequentially (lines 163-165):
1. `SellerOnboardingWizard` — a dialog-based wizard
2. `SellerHeroBanner` — always visible greeting banner
3. `StoreSetupChecklist` — checklist card (uses Card wrapper)

The wizard and checklist show overlapping information (same `useSellerOnboarding` hook, same steps). A new seller sees BOTH the wizard dialog AND the checklist underneath.

**Fix**: Remove `StoreSetupChecklist` from the dashboard — the wizard already covers the same steps. If the wizard is dismissed, the checklist is redundant since the hero banner action buttons cover the key actions.

---

### Issue 6: Redundant `LayoutGrid` Import

Line 22 imports `LayoutGrid` but it's never used anywhere in the file.

---

### Implementation Plan

**Phase 1: Dashboard cleanup (low risk)**
- Remove unused imports (`Card`, `LayoutGrid`) from `SellerDashboard.tsx`
- Remove duplicate "New Product" from Command Center
- Remove `StoreSetupChecklist` from dashboard render

**Phase 2: Flatten dashboard widgets (medium, 9 files)**
- Convert all 9 dashboard component files from Card to enterprise-standard `div` containers
- Update `DashboardSkeletons.tsx` and `DashboardPlaceholders.tsx`

**Phase 3: Flatten seller pages (medium, 12 files)**
- Migrate all remaining seller pages from Card wrappers to flattened divs
- Each file: remove Card imports, replace JSX wrappers

**Verification**: Full `npx tsc --noEmit` after each phase.

### Files Changed

**Phase 1** (3 edits):
- `src/pages/seller/SellerDashboard.tsx`

**Phase 2** (9 edits):
- `src/components/seller/RevenueChart.tsx`
- `src/components/seller/ProductHealthDonut.tsx`
- `src/components/seller/RecentOrdersTable.tsx`
- `src/components/seller/TopProductsLeaderboard.tsx`
- `src/components/seller/NotificationCenter.tsx`
- `src/components/seller/StoreHealthScore.tsx`
- `src/components/seller/StoreSetupChecklist.tsx`
- `src/components/seller/DashboardSkeletons.tsx`
- `src/components/seller/DashboardPlaceholders.tsx`

**Phase 3** (12 edits):
- `src/pages/seller/SellerBalance.tsx`
- `src/pages/seller/SellerGoals.tsx`
- `src/pages/seller/SellerAnalytics.tsx`
- `src/pages/seller/SellerTaxFeeSummary.tsx`
- `src/pages/seller/SellerRevenueBreakdown.tsx`
- `src/pages/seller/SellerCategories.tsx`
- `src/pages/seller/SellerStoreTabs.tsx`
- `src/pages/seller/SellerSettingsAppearance.tsx`
- `src/pages/seller/SellerLeakReports.tsx`
- `src/pages/seller/SellerTaxSummary.tsx`
- `src/pages/seller/SellerTransactionHistory.tsx`
- `src/pages/seller/SellerFlashSales.tsx`

