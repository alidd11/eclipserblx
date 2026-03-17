

## End-to-End Audit Results

After reviewing the codebase, database, console logs, and network requests, here's what I found:

### Issues Found

**1. Admin Products page still has legacy slug logic** (`src/pages/admin/Products.tsx`)
- Still shows a "Slug" input field in the product form (line 990-996)
- Still auto-generates slug from name on change (line 985)
- Still appends `crypto.randomUUID().slice(0, 8)` suffix for new products (lines 354-357)
- Still displays slug under product name in the table (line 934)
- **Fix**: Remove the slug input field, remove the forced UUID suffix logic, use the same clean deterministic slug approach as the seller pages, and replace slug display with product_number.

**2. `AbandonedCartBanner` ref warning** (`src/components/marketplace/AbandonedCartBanner.tsx`)
- Console error: "Function components cannot be given refs" when lazy-loaded in Landing page
- The component is used with `lazy()` + `Suspense`, which tries to attach a ref
- **Fix**: Wrap the component with `React.forwardRef`

**3. Admin product table shows slug instead of product_number** (`src/pages/admin/Products.tsx`, line 934)
- Shows the internal slug text under the product name
- Should show the product number for consistency with the new system
- **Fix**: Replace `{product.slug}` with `#{(product as any).product_number}` display

### No Issues Found (Verified Clean)
- **Database**: 0 products with legacy UUID-suffixed slugs (cleanup from earlier is confirmed)
- **Seller product editor**: Slug field and `generateSlug` properly removed
- **Seller products quick-add**: Slug field properly removed
- **Product routing**: All routes correctly use `product_number` with slug fallback for legacy URLs
- **Category slugs**: Still use `generateSlug` correctly (categories need text slugs)
- **Store slugs**: Still use `generateSlug` correctly (stores need text slugs)
- **Button/Badge components**: Properly accept `variant` and `size` props (build errors were from missing node_modules)
- **Network**: Only issue is a CORS-blocked Discord invite API call (external, not actionable)
- **Edge functions**: All running normally, no errors

### Changes Summary

| File | Change |
|------|--------|
| `src/pages/admin/Products.tsx` | Remove slug input field, remove UUID suffix logic, use clean deterministic slug, show product_number instead of slug |
| `src/components/marketplace/AbandonedCartBanner.tsx` | Wrap with `forwardRef` to fix React ref warning |

