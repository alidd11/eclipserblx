

## Fix: Mobile Tabs Wrapping + Custom Domains Table UX

### Problem 1: Tabs wrapping on mobile
13 pages use bare `<TabsList>` without the established mobile pattern (desktop: hidden tabs, mobile: Select dropdown). These tabs overflow/wrap on narrow screens.

**Pages to fix (admin):**
- ManualPayouts.tsx (2 tabs)
- RecruiterPayouts.tsx (3 tabs)
- RecruiterCommissions.tsx (4 tabs)
- IncomeSources.tsx (2 tabs)
- DeveloperSubmissions.tsx (4 tabs)
- DeveloperPayments.tsx (3 tabs)
- Affiliates.tsx (2 tabs)
- Recruiters.tsx (3 tabs)
- SellerAgreements.tsx (3 tabs)
- StoreApplications.tsx (3 tabs)

**Pages to fix (seller):**
- SellerOrders.tsx (2 tabs)
- SellerImport.tsx (2 tabs)

**Pages to fix (account):**
- AdAnalyticsPage.tsx (already has `isMobile` check but uses bare TabsList for desktop — fine)

**Pattern to apply** (already used on ~12 other pages):
```text
{/* Desktop tabs */}
<TabsList className="hidden sm:inline-flex">
  <TabsTrigger .../>
</TabsList>

{/* Mobile dropdown */}
<div className="sm:hidden">
  <Select value={activeTab} onValueChange={setActiveTab}>
    <SelectTrigger className="w-auto min-w-[140px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="...">Label</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Pages using `defaultValue` (uncontrolled) will need conversion to controlled `value`/`onValueChange` state.

---

### Problem 2: Custom Domains table on mobile
The `<Table>` with 9 columns is unusable on a 440px viewport. Replace with a stacked card layout on mobile.

**Approach:**
- Keep the `<Table>` for desktop (`hidden md:block`)
- Add a card-based list for mobile (`md:hidden`) showing:
  - Domain name + external link
  - Store name
  - Badges row: Type, Status, SSL, Health
  - Action buttons (health check, fix)
  - Last check timestamp

This matches the card-list pattern used elsewhere in the app for mobile-friendly data display.

---

### Files to edit
1. `src/pages/admin/CustomDomains.tsx` — add mobile card layout
2. `src/pages/admin/ManualPayouts.tsx` — add mobile select
3. `src/pages/admin/RecruiterPayouts.tsx` — add mobile select
4. `src/pages/admin/RecruiterCommissions.tsx` — add mobile select
5. `src/pages/admin/IncomeSources.tsx` — add mobile select
6. `src/pages/admin/DeveloperSubmissions.tsx` — add mobile select
7. `src/pages/admin/DeveloperPayments.tsx` — add mobile select
8. `src/pages/admin/Affiliates.tsx` — add mobile select
9. `src/pages/admin/Recruiters.tsx` — add mobile select
10. `src/pages/admin/SellerAgreements.tsx` — add mobile select
11. `src/pages/admin/StoreApplications.tsx` — add mobile select
12. `src/pages/seller/SellerOrders.tsx` — add mobile select
13. `src/pages/seller/SellerImport.tsx` — add mobile select

