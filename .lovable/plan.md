

## Fix: Cloudflare Worker Internal Fetch Cache for SW Bootstrap Files

### Root cause (final layer)
The Cloudflare Worker code correctly passes through `/sw.js` to the origin. The origin correctly serves `eclipse-v5`. **But** Cloudflare's `fetch()` API inside Workers uses its own edge cache by default. The previous stale `/sw.js` is cached in this internal layer, so even after a zone-level cache purge, the Worker's `fetch()` still returns the old cached response.

### Fix
**File: `supabase/functions/deploy-cloudflare-worker/index.ts`**

In the PWA bootstrap handler (lines 248-258 of the generated worker script), change the `fetchOrigin` call to a direct `fetch()` with `cf: { cacheTtl: 0 }` to bypass Cloudflare's internal edge cache for these critical files.

Replace the current PWA bootstrap block with:
```javascript
if (PWA_BOOTSTRAP.indexOf(path) !== -1) {
  var pwaOriginUrl = ORIGIN_URL + url.pathname + url.search;
  var pwaReq = buildOriginRequest(request, pwaOriginUrl, hostname);
  // Bypass CF edge cache entirely for SW bootstrap files
  var pwaRes = await fetch(pwaReq, { cf: { cacheTtl: 0, cacheEverything: false } });
  var pwaHeaders = new Headers(pwaRes.headers);
  pwaHeaders.set("X-Eclipse-Worker", "pass-pwa-bootstrap");
  if (path.endsWith(".js") || path === "/offline.html") {
    pwaHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
    pwaHeaders.set("Pragma", "no-cache");
  }
  return new Response(pwaRes.body, { status: pwaRes.status, headers: pwaHeaders });
}
```

### After code change
1. Redeploy the Cloudflare Worker (run `deploy-cloudflare-worker`)
2. Purge cache again (run `purge-cloudflare-cache`)
3. Verify `eclipserblx.com/sw.js` shows `eclipse-v5`

### Why this is the final fix
- Origin confirmed serving `eclipse-v5` ✅
- Worker script confirmed containing PWA passthrough ✅  
- Worker confirmed deployed ✅
- Zone cache confirmed purged ✅
- Only remaining cache layer: Cloudflare Worker's internal `fetch()` cache — this fix bypasses it

