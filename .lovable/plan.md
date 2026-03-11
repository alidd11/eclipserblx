

## Numeric Product IDs for URLs

### Approach

Add an auto-incrementing integer column (`product_number`) to the `products` table. Product URLs change from `/products/some-slug-name` to `/products/12345`. The slug column stays for SEO (sitemaps, OG tags) but is no longer used for routing.

This is a large but mechanical change — ~24 files reference `/products/${slug}` in links, plus the route definition, the detail page query, edge functions (sitemap, OG proxy), and slug generation logic.

### Database Migration

```sql
-- Add sequential product number
ALTER TABLE products ADD COLUMN product_number BIGINT;

-- Create sequence and backfill existing products
CREATE SEQUENCE products_product_number_seq;
UPDATE products SET product_number = nextval('products_product_number_seq')
  WHERE product_number IS NULL;

-- Make it non-nullable with auto-default going forward
ALTER TABLE products
  ALTER COLUMN product_number SET NOT NULL,
  ALTER COLUMN product_number SET DEFAULT nextval('products_product_number_seq');

-- Unique index for lookups
CREATE UNIQUE INDEX idx_products_product_number ON products(product_number);
```

### Frontend Changes

**1. Route definition** — `AppRoutes.tsx`, `StoreStandalonePage.tsx`
- Change `/products/:slug` → `/products/:productNumber`

**2. ProductDetail page** — `src/pages/ProductDetail.tsx`
- Parse `productNumber` from URL params
- Query with `.eq('product_number', Number(productNumber))` instead of `.eq('slug', slug)`

**3. All product link references (~24 files)**
- Every `to={`/products/${product.slug}`}` becomes `to={`/products/${product.product_number}`}`
- Product select queries that feed links need to include `product_number` in their `.select()` calls

**4. Slug generation** — Seller product creation (`SellerProducts.tsx`, `StoreApplications.tsx`)
- Keep generating slugs (for SEO/OG), but product_number is auto-assigned by the database

**5. Edge functions** — `og-proxy`, `product-og`, `dynamic-sitemap`
- OG proxy: accept `product_number` in the path, query by it, but still use slug for canonical URL/SEO
- Sitemap: select `product_number` and use it in `<loc>` URLs
- Product-OG: accept number param, query by `product_number`

**6. Share URLs / SEO** — `ProductDetail.tsx` share handler, `StructuredData.tsx`
- Update canonical URLs and share links to use product_number

**7. Prefetch hook** — `usePrefetchProduct.ts`
- Change to accept and query by product_number

### Files affected (complete list)

| Area | Files |
|------|-------|
| Routes | `AppRoutes.tsx`, `StoreStandalonePage.tsx` |
| Detail page | `ProductDetail.tsx` |
| Links (cards/lists) | `HeroProductShowcase.tsx`, `Featured.tsx`, `RecentReleasesCarousel.tsx`, `NewArrivalsCard.tsx`, `PWALandingHero.tsx`, `PWAFeaturedProducts.tsx`, `MarketplaceSection.tsx`, `MyPurchases.tsx`, + ~14 more component files |
| SEO | `StructuredData.tsx`, `usePrefetchProduct.ts` |
| Edge functions | `og-proxy/index.ts`, `product-og/index.ts`, `dynamic-sitemap/index.ts` |
| Seller flows | `SellerProducts.tsx` (product creation still generates slug, but links use number) |

### What stays the same
- Slug column remains in the database (used internally for SEO metadata)
- Store URLs continue using slugs (`/store/:storeSlug`)
- Category slugs unchanged
- All relational integrity (UUIDs) untouched

