

## Plan: Maximum SSR-like Optimization Within Lovable

### What's already done (no changes needed)
- og-proxy serves rich HTML to crawlers with product/store content, JSON-LD, nav
- Cache headers standardized across all routes
- Static HTML shell in index.html with nav + headline
- Preconnect/prefetch hints for backend, Discord, Stripe

### What we can still add

---

### 1. Cloudflare Worker data injection for ALL users (highest impact)

Update the Worker script in `deploy-cloudflare-worker/index.ts` so that for key pages (`/`, `/products`, `/categories`, `/featured`), it fetches initial data from the API and injects it into the HTML as `window.__INITIAL_DATA__` before serving to the browser. React then reads this on boot instead of making API calls — eliminating the loading spinner entirely on first paint.

**Worker changes:**
- Before proxying to origin for human users on key routes, fetch featured products / categories from the REST API
- Intercept the origin HTML response, inject a `<script>` tag with the pre-fetched data
- Add a `Stale-While-Revalidate` cache layer so this doesn't add latency

**Frontend changes:**
- Create a `useInitialData` hook that checks `window.__INITIAL_DATA__` before calling the API
- Update `MarketplaceSection`, category queries, and featured product queries to use this hook
- Data is still fetched client-side as a fallback (dev mode, cache miss, etc.)

### 2. Expand og-proxy with category page support

Add `/categories/:slug` handling to `og-proxy/index.ts`:
- Fetch the category name + description from the database
- Fetch top 6-8 products in that category
- Return HTML with an `ItemList` JSON-LD schema and visible product grid for crawlers
- This makes category pages fully indexable with real product content

### 3. Richer static shells per route type

Update the static shell inside `index.html` to be more useful — currently it shows a generic headline. Instead, add a small inline script that reads `location.pathname` and swaps the shell content to match the route (e.g., "Browse Products" for `/products`, "Categories" for `/categories`). This gives both crawlers and users route-appropriate content before React boots.

### 4. Add BreadcrumbList structured data

Add `BreadcrumbList` JSON-LD to product pages, category pages, and store pages in both:
- The og-proxy (for crawlers)
- React components (for Google's JS rendering)

This improves search result appearance with breadcrumb trails.

---

### Files affected

| File | Change |
|------|--------|
| `supabase/functions/deploy-cloudflare-worker/index.ts` | Add data pre-fetching + injection for key routes |
| `supabase/functions/og-proxy/index.ts` | Add `/categories/:slug` with product listings + ItemList schema |
| `index.html` | Route-aware static shell + breadcrumb hints |
| `src/hooks/useInitialData.ts` | New hook to read `window.__INITIAL_DATA__` |
| `src/components/home/MarketplaceSection.tsx` | Use initial data if available |
| `src/components/seo/BreadcrumbSchema.tsx` | New component for breadcrumb JSON-LD |
| Product/category/store page components | Add BreadcrumbSchema |

### Risk level
Low-medium. The Worker data injection is the most complex change but has a clean fallback — if the injection fails or is missing, the app works exactly as it does today. All other changes are additive.

