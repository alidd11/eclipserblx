

# Permanent Fix: White Screen & Discord Image Issues

## Root Cause Analysis

### White Screen
The Cloudflare Worker (`eclipse-og-proxy`) on `eclipserblx.com/*` intercepts **ALL traffic** — both bots and humans. For human visitors, it manually proxies requests to `roleplay-hub-shop.lovable.app` via the `proxyToOrigin` function. This manual proxy has multiple failure modes:

1. **Auth-bridge loop**: The Lovable origin redirects to auth-bridge. The worker tries fetching `/index.html` directly, but that fetch can ALSO redirect to auth-bridge — resulting in a blank/empty response.
2. **Origin downtime (522)**: When the Lovable container is cold or unavailable, the manual proxy returns an error response with no fallback.
3. **Content-Type mismatch**: The worker force-sets `Content-Type: text/html` for non-asset routes even when the origin returns something else (e.g., JSON API responses, service worker JS).

**The fundamental mistake**: The worker should NOT manually proxy human traffic. Cloudflare already handles proxying to the origin via DNS. The worker only needs to intercept **bot requests** for OG tags.

### Discord Generic Image
The `og-proxy` edge function uses `store.logo_url` (a small square PNG) as the OG image for store pages. Discord expects a wide image (1200×630). The Quantis store has a proper `banner_url` that should be used instead.

## The Fix

### 1. Cloudflare Worker — Stop proxying human traffic (eliminates white screen forever)

**File**: `supabase/functions/deploy-cloudflare-worker/index.ts` (the WORKER_SCRIPT constant)
**Also**: `docs/cloudflare-worker-og.js` (reference copy)

Replace `proxyToOrigin(request, url)` with `fetch(request)` — this tells the Cloudflare Worker to **pass through** to the origin using Cloudflare's normal proxy behavior (DNS, SSL, caching all work normally). No manual header manipulation, no redirect interception, no auth-bridge issues.

```text
Before (broken):
  Human request → Worker intercepts → Manual fetch to lovable.app → Auth-bridge redirect → Blank screen

After (fixed):
  Human request → Worker intercepts → return fetch(request) → Cloudflare normal proxy → Works perfectly
  Bot request → Worker intercepts → og-proxy edge function → Rich OG HTML
```

The entire `proxyToOrigin` function is removed. For non-bot traffic, the worker simply returns `fetch(request)` which is the standard Cloudflare pattern for "do nothing, pass through normally."

### 2. OG Proxy — Use banner image for store pages (fixes Discord embeds)

**File**: `supabase/functions/og-proxy/index.ts`

- Add `banner_url` to the store query select
- Prefer `banner_url` over `logo_url` for the OG image

### 3. Re-deploy the worker

After updating the code, invoke the `deploy-cloudflare-worker` function to push the new worker to Cloudflare. Then purge the cache.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/deploy-cloudflare-worker/index.ts` | Rewrite WORKER_SCRIPT: remove proxyToOrigin, use `fetch(request)` for passthrough |
| `supabase/functions/og-proxy/index.ts` | Add `banner_url` to store query, prefer it over `logo_url` |
| `docs/cloudflare-worker-og.js` | Update reference copy to match new worker |

## Why This Is Permanent

- Human traffic never touches custom proxy logic again — Cloudflare handles it natively
- No auth-bridge interception needed — the origin serves directly via Cloudflare proxy
- No Content-Type guessing — Cloudflare preserves the origin's headers
- No manual redirect handling — Cloudflare follows its normal redirect behavior
- The worker only does ONE thing: detect bots and serve them OG HTML from the edge function

