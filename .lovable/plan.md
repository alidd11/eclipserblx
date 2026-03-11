

## Full Website Consistency Audit

After scanning the entire codebase, here are all the issues found, grouped by category.

---

### 1. Duplicate Headers Inside Hubs (Critical — visually broken)

When child pages render inside hub tabs via `AdminHubProvider`, the `AdminLayout`/`SellerLayout` chrome is stripped. But each child page still renders its **own page header and stat cards**, duplicating content the hub already shows.

**Admin pages (9 files):**
- `SellerPayouts.tsx` — renders `<h1>Seller Payouts</h1>` + stat cards inside PayoutsHub
- `DeveloperPayments.tsx` — renders `<h1>Developer Payments</h1>` + stat cards inside PayoutsHub
- `ManualPayouts.tsx` — renders `<h1>Manual Payouts</h1>` + stat cards inside PayoutsHub
- `Refunds.tsx` — renders `<h1>Refunds</h1>` with icon + stat cards inside DisputesRefundsHub
- `Disputes.tsx` — renders `<h1>Disputes & Escrow</h1>` with icon + stat cards inside DisputesRefundsHub
- `Affiliates.tsx` — renders `<h1>Affiliate Program</h1>` inside AffiliateHub
- `AffiliateApplications.tsx` — renders `<h1>Affiliates</h1>` + stat cards inside AffiliateHub
- `Referrals.tsx` — renders `<h1>Referrals</h1>` + stat cards inside AffiliateHub
- `IncomeSources.tsx` — renders `<h1>Income Sources</h1>` with icon inside RevenueHub

**Seller pages (5 files):**
- `SellerBalance.tsx` — renders `<h1>Balance & Payouts</h1>` **AND** 3 duplicate summary cards (identical to SellerFinanceHub header cards)
- `SellerRevenueBreakdown.tsx` — renders `<h1>Revenue Breakdown</h1>`
- `SellerTransactionHistory.tsx` — renders `<h1>Transaction History</h1>`
- `SellerTaxFeeSummary.tsx` — renders `<h1>Tax & Fee Summary</h1>`
- `SellerTaxSummary.tsx` — renders `<h1>Tax Summary</h1>` with icon

**Fix:** Import `useIsInsideHub` and wrap headers/duplicate stats in `{!isInsideHub && (...)}` blocks in all 14 files.

---

### 2. Inconsistent Header Styling

Headers across child pages use different patterns:

| Pattern | Files |
|---------|-------|
| `text-3xl font-bold` | SellerPayouts, SellerBalance, Disputes |
| `text-2xl font-bold` | DeveloperPayments, ManualPayouts, AffiliateApplications |
| `text-2xl font-display font-bold` | Affiliates, Referrals, IncomeSources, SellerRevenueBreakdown, SellerTransactionHistory, SellerTaxFeeSummary |
| `text-2xl font-bold` (no font-display) | SellerTaxSummary |

Icons in headers: Refunds, Disputes, IncomeSources, SellerTaxSummary include icons in `<h1>`. Others do not.

**Fix:** Standardise all to `text-2xl font-display font-bold` (the established project convention). Remove icons from standalone h1 elements (icons belong in hub headers only).

---

### 3. Inconsistent Toast Import (Mixed `sonner` and `@/hooks/use-toast`)

26 files use the deprecated `@/hooks/use-toast` import with the old `toast({ title, description })` API. 68 files use the correct `sonner` import with `toast.success()` / `toast.error()` API.

**Affected files include:** `DeveloperPayments.tsx`, `DeveloperPaymentDetail.tsx`, `Recruiters.tsx`, `RecruiterPayouts.tsx`, `RecruiterCommissions.tsx`, `CustomDomains.tsx`, `Login.tsx`, `Subscribers.tsx`, `StoreApplications.tsx`, `SellerSettingsDomain.tsx`, `Recruiter.tsx`, `NotificationPreferences.tsx`, plus IP Shield pages and others.

**Fix:** Migrate all 26 files from `import { toast } from '@/hooks/use-toast'` / `import { useToast } from '@/hooks/use-toast'` to `import { toast } from 'sonner'` and update call sites to use `toast.success(msg)` / `toast.error(msg)`.

---

### 4. PWADiscordBanner forwardRef Warning (Console Error)

The console shows: `Function components cannot be given refs`. The `PWADiscordBanner` component is a function component that receives a ref from `ScrollReveal` on the Landing page, but it doesn't use `forwardRef`. Interestingly, it does use `forwardRef` for its internal `DiscordLogo` SVG, but the component itself is not wrapped with `forwardRef`.

**Fix:** Wrap `PWADiscordBanner` with `forwardRef` or remove the ref from the parent `ScrollReveal`.

---

### 5. Feature Flag 406 Error (Non-blocking)

Network request to `feature_flags?name=eq.marketplace` returns 406 because the flag row doesn't exist but the query expects a single object (`Accept: application/vnd.pgrst.object+json`). The code handles this gracefully (falls back), but it generates a network error on every page load.

**Fix:** Change the query to use `.maybeSingle()` instead of `.single()` so PostgREST doesn't return a 406 when the row is missing.

---

### Summary of Changes

| Category | Files Affected | Severity |
|----------|---------------|----------|
| Duplicate headers in hubs | 14 pages | High (visual) |
| Header style inconsistency | 14 pages | Medium (polish) |
| Toast import inconsistency | ~26 files | Medium (maintenance) |
| PWADiscordBanner ref warning | 1 component | Low (console noise) |
| Feature flag 406 error | 1 hook | Low (network noise) |

### Implementation Order

1. Fix duplicate headers (14 files) — highest visual impact
2. Standardise header typography (same 14 files, done together)
3. Fix PWADiscordBanner ref warning (1 file)
4. Fix feature flag 406 error (1 hook)
5. Migrate toast imports (26 files — can be batched)

No database changes required.

