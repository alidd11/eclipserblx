

## Plan: SEO & Performance Optimization (Within Lovable's Constraints)

### Context

True SSR isn't possible on Lovable (no server runtime). But there are meaningful improvements we can make without breaking anything.

### Recommended Changes

**1. Expand `og-proxy` to return full HTML for crawlers (high impact, zero risk to users)**

Update the existing `og-proxy` edge function to return richer HTML for bot user agents — not just meta tags, but also visible content (product name, description, price, store name, images) in the HTML body. This means crawlers index real content, not just meta tags. Regular users are unaffected since the Cloudflare Worker only routes bots to this function.

**2. Add Cloudflare cache headers to `og-proxy` responses**

Already partially done, but standardize:
- `/` → `max-age=60, stale-while-revalidate=30`
- `/categories/*` → `max-age=120`
- `/product/:id` → `max-age=300`
- Static pages → `max-age=3600`

**3. Reduce initial JS bundle further**

- Audit and lazy-load any remaining heavy components that aren't needed on first paint
- Ensure `framer-motion` chunks aren't loaded until needed (already partially done)
- Review if any Radix UI primitives can be deferred

**4. Preload critical API calls in `index.html`**

Add `<link rel="preconnect">` for the backend URL and `<link rel="prefetch">` for the most common API endpoints (featured products, categories) so data fetching starts before React boots.

**5. Add a static HTML shell with content hints in `index.html`**

Embed a lightweight skeleton with the site name, navigation links, and key text directly in `index.html`. This gives crawlers something to index even before JS runs, and gives users a faster perceived load.

---

### What this does NOT change
- No framework migration (stays Vite + React)
- No breaking changes to routing or components
- No changes to authenticated pages
- The Cloudflare Worker routing stays the same

### Risk level
Low — changes are additive. The og-proxy expansion only affects bot traffic. The HTML shell and preconnect hints are standard performance patterns.

### Files affected
- `supabase/functions/og-proxy/index.ts` — richer HTML for crawlers
- `index.html` — preconnect hints, static shell content
- Potentially minor lazy-loading tweaks in a few page components

