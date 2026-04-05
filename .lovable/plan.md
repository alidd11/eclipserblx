

## Remove All Breadcrumbs from the Site

### What Changes

Breadcrumbs will be fully removed. Navigation will rely on the sidebar, bottom tab bar, and native browser/gesture back buttons — matching the enterprise pattern used by modern marketplaces like Shopify admin and Discord.

### Steps

1. **LayoutShell.tsx** — Remove the `UniversalBreadcrumb` lazy import, the `showBreadcrumb` prop, and the `{showBreadcrumb && ...}` render block
2. **MainLayout.tsx** — Remove the `showBreadcrumb` prop from the interface and stop passing it to `LayoutShell`
3. **Delete `src/components/layout/UniversalBreadcrumb.tsx`** — No longer needed
4. **Delete `src/components/store/MarketplaceBreadcrumb.tsx`** — Already unused (dead code)
5. **Clean up references** — Remove `showBreadcrumb={false}` from `AdminLayout.tsx`, `SellerLayout.tsx`, and `SupportTicketDetail.tsx` (prop will no longer exist)
6. **`useNavigationHistory.ts`** — Keep as-is (it powers other features, not breadcrumbs)
7. **`src/components/ui/breadcrumb.tsx`** — Keep (it's a shadcn/ui primitive that may be useful later)

### Files Changed
- `src/components/layout/LayoutShell.tsx` — Remove breadcrumb import + render
- `src/components/layout/MainLayout.tsx` — Remove `showBreadcrumb` prop
- `src/components/admin/AdminLayout.tsx` — Remove `showBreadcrumb={false}`
- `src/components/seller/SellerLayout.tsx` — Remove `showBreadcrumb={false}`
- `src/pages/SupportTicketDetail.tsx` — Remove `showBreadcrumb={false}`
- **Delete** `src/components/layout/UniversalBreadcrumb.tsx`
- **Delete** `src/components/store/MarketplaceBreadcrumb.tsx`

