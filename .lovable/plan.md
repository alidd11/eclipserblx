

## Fix: Add `product_number` to All Product Queries

The `product_number` column exists in the database and is populated, but many Supabase `.select()` calls use explicit column lists that don't include `product_number`. This causes `undefined` in URLs.

### Files needing `product_number` added to their select queries

| File | Current select (missing product_number) |
|------|----------------------------------------|
| `src/components/marketplace/RecentReleasesCarousel.tsx` | `id, name, slug, price, images, created_at, category_id, is_resellable` |
| `src/components/marketplace/MostPopularSection.tsx` | `id, name, slug, price, images, category_id, is_resellable, download_count` |
| `src/components/marketplace/FeaturedProductCard.tsx` | Two queries — both missing product_number |
| `src/components/store/StoreRecommendations.tsx` | Three queries — all missing product_number |
| `src/components/store/StoreBestSellers.tsx` | `id, name, slug, price, images, is_resellable, download_count` |
| `src/components/product/FrequentlyBoughtTogether.tsx` | `id, name, slug, price, images, is_active` |
| `src/components/search/SearchCommandPalette.tsx` | Two queries — both missing product_number |
| `src/pages/Products.tsx` | `id, name, slug, price, images, is_active, is_featured, category_id, ...` |
| `src/pages/SearchResults.tsx` | `id, name, slug, price, images, description, ...` |
| `src/pages/Categories.tsx` | `id, name, slug, price, images` |

### Additional fix
The `ProductCard` component itself uses `slug` prop for the link (`/products/${slug}`). Since callers now pass `product_number` as the `slug` prop, this works — but only when the query actually returns `product_number`. Adding it to all queries above will fix the undefined issue.

### Edge function updates
Also update the 4 edge functions (`post-category-product-feed`, `post-store-showcase`, `send-product-drop-webhook`, `discord-customer-bot`) to select `product_number` and use it in URLs, plus add a slug fallback in `ProductDetail.tsx` so old links still work.

Total: ~14 file edits, all mechanical — just adding `product_number` to select strings.

