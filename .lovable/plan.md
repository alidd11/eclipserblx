

## Fix Product Images in Shared URLs (Discord/Twitter embeds)

### Root Cause
The `og-proxy` edge function works correctly (verified — returns product-specific title, image, and description). However, Discord's bot receives the SPA's generic `index.html` instead, meaning the Cloudflare Worker is either not deployed, not active, or not intercepting correctly.

The current architecture is fragile: it depends entirely on a Cloudflare Worker intercepting bot user-agents. If the worker stops running or the route gets removed, all shared links show generic metadata.

### Fix: Two-Layer Approach

**Layer 1: Fix and redeploy the Cloudflare Worker**
- The worker script and `og-proxy` function are correct — just needs redeployment
- Trigger the `deploy-cloudflare-worker` edge function from the admin panel or invoke it directly

**Layer 2: Add a share URL fallback that works WITHOUT Cloudflare**
- Update the Cloudflare Worker to recognize a `/share/` path prefix that ALWAYS proxies to `og-proxy` (not just for bots). This means `eclipserblx.com/share/products/slug` will always serve OG HTML and redirect humans to the real page.
- Add a Share button on the `ProductDetail` page that copies the `/share/products/slug` URL — this guarantees correct embeds even if bot detection fails.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/deploy-cloudflare-worker/index.ts` | Add `/share/` prefix handling in worker script — always proxy these paths to og-proxy regardless of user-agent |
| `src/pages/ProductDetail.tsx` | Add a Share button (already imports `Share2` icon) that copies the share-friendly URL using `navigator.share` (mobile) or clipboard (desktop) |

### How the `/share/` prefix works

```text
User shares: eclipserblx.com/share/products/uk-police-mega-bundle
                    ↓
CF Worker sees /share/ prefix → ALWAYS proxies to og-proxy
                    ↓
og-proxy returns HTML with:
  - og:image = actual product image
  - og:title = "UK Police Mega Bundle | Eclipse"
  - <meta http-equiv="refresh"> → redirects humans to /products/uk-police-mega-bundle
                    ↓
Discord bot reads OG tags → shows product image ✓
Human browser redirects instantly → sees real product page ✓
```

The regular `/products/slug` URLs still work via bot detection as before, but the `/share/` URLs are the guaranteed-to-work fallback.

