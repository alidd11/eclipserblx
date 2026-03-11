

## Comprehensive SelectTrigger Width Standardization

### Problem
Despite previous rounds of fixes, many filter/dropdown triggers across the dashboards still use inconsistent fixed widths (`w-32`, `w-[130px]`, `w-[140px]`, `w-[150px]`, `w-[160px]`, `w-[180px]`) or have wrapper divs with fixed widths (`w-48`, `w-64`). This creates visual inconsistency on mobile.

### Standard
All dashboard filter `SelectTrigger` components should use: `w-auto min-w-[140px]`

Exceptions (left unchanged):
- Form fields inside dialogs/modals (these should fill their container)
- Inline table cell selects (role changers, status updaters inside rows)
- Sort selectors on public pages (SearchResults, AllStores) -- these have intentional fixed widths with icons

### Files to Update

**Seller pages (4 files):**
1. `SellerAnalytics.tsx` line 253 -- `w-32` to `w-auto min-w-[140px]`
2. `SellerTransactionHistory.tsx` line 92 -- `w-32` to `w-auto min-w-[140px]`
3. `SellerRevenueBreakdown.tsx` line 97 -- `w-32` to `w-auto min-w-[140px]`
4. `SellerTaxSummary.tsx` line 152 -- `w-[140px]` to `w-auto min-w-[140px]`

**Admin pages (7 files):**
5. `Referrals.tsx` line 222 -- `w-32` to `w-auto min-w-[140px]`
6. `Disputes.tsx` line 341 -- `w-[130px]` to `w-auto min-w-[140px]`
7. `PlatformLedger.tsx` lines 183, 193 -- `w-[140px]` and `w-[180px]` to `w-auto min-w-[140px]`
8. `Applications.tsx` line 344 -- `w-[180px]` to `w-auto min-w-[140px]`
9. `SellerCommissions.tsx` line 176 -- `w-[150px]` to `w-auto min-w-[140px]`
10. `IncomeSources.tsx` lines 390, 556 -- `w-[140px]` and `w-[130px]` to `w-auto min-w-[140px]`
11. `StaffActivity.tsx` lines 241, 257 -- remove wrapper `div` fixed widths (`w-48`, `w-64`), add `w-auto min-w-[140px]` to the triggers

**IP Staff pages (1 file):**
12. `IPStaffTakedowns.tsx` lines 88, 138 -- `w-[140px]` and `w-[130px]` to `w-auto min-w-[140px]`
13. `IPStaffInbox.tsx` lines 100, 167 -- `w-[140px]` to `w-auto min-w-[140px]`

**Other (1 file):**
14. `StaffProfile.tsx` line 710 -- `w-[160px]` to `w-auto min-w-[140px]`

### What stays unchanged
- `SelectTrigger` inside forms/dialogs (no className or full-width -- correct)
- `SellerSettingsTeam.tsx` inline role selectors in table rows
- `SearchResults.tsx`, `AllStores.tsx` sort selectors (public page, intentional design)
- All triggers already using `w-auto min-w-[140px]`

### Approach
Single class replacement per trigger. ~15 files, ~20 triggers total. No logic changes.

