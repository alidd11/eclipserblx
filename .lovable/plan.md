
## Enterprise SEO Hardening for Roblox Marketplace

### What You Already Have (Strong)
✅ Dynamic sitemap with products/stores/categories
✅ IndexNow (Bing/Yandex instant indexing)
✅ JSON-LD structured data (Product, Organization, Store, FAQ, Breadcrumbs)
✅ OG proxy for social crawlers
✅ Static HTML shell for bot rendering
✅ Per-page `usePageMeta` with canonical tags
✅ noindex on non-production domains

---

### What's Missing (7 Changes)

**1. Stale Static Sitemap — Remove It**
`public/sitemap.xml` has hardcoded dates from March 2026 and conflicts with the dynamic sitemap. Google may crawl the static one instead. Remove it — `robots.txt` already points to the dynamic one.

**2. Google Ping is Deprecated**
`submit-indexnow` pings `google.com/ping?sitemap=...` — Google deprecated this in 2023. Replace with Google Search Console API ping or just remove the dead call.

**3. Missing IndexNow Key File**
IndexNow requires a verification key file at `https://eclipserblx.com/{key}.txt`. The key is `eclipse-indexnow-key-2026` but there's no matching file in `public/`. Without it, Bing/Yandex silently reject all submissions.

**4. Category Pages Need Unique SEO Titles**
Currently `/products?category=police-vehicles` has a generic title. Each category filter should generate a keyword-rich title like "Buy Roblox Police Vehicles | Eclipse Marketplace" and a targeted meta description. This is the highest-impact change — these are the pages Google will rank for long-tail queries.

**5. Sitemap: Add `<lastmod>` to Static Pages**
The dynamic sitemap has no `<lastmod>` on static pages (home, categories, etc.). Google uses this to prioritise crawl frequency. Add auto-generated dates.

**6. SEO Landing Page Content for `/sell`**
The "Start Selling" page should have crawlable keyword-rich content targeting "sell roblox assets", "roblox asset marketplace for sellers", etc. Currently it's likely just a form/wizard with minimal text.

**7. Internal Linking: Add Footer SEO Links**
Enterprise marketplaces (Amazon, Etsy, Shopify) include a rich footer with links to top categories, popular stores, and help pages. This distributes PageRank and helps Google discover deep pages.

### Files Changed

- **Delete**: `public/sitemap.xml` (stale duplicate)
- **Create**: `public/eclipse-indexnow-key-2026.txt` (verification file)
- **Edit**: `supabase/functions/submit-indexnow/index.ts` — remove deprecated Google ping
- **Edit**: `supabase/functions/dynamic-sitemap/index.ts` — add lastmod to static pages
- **Edit**: `src/pages/Products.tsx` — category-aware SEO titles via `usePageMeta`
- **Edit**: `src/components/layout/Footer.tsx` — add SEO category/store links section

### Risk
None — all changes are additive SEO improvements. No user-facing functionality changes.
