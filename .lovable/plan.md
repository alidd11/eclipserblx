

# Root Cause and Permanent Fix for 522 Errors

## The Problem

The `eclipse-og-proxy` Worker has a critical bug on **line 111** of the generated script. For the **main domain** (`eclipserblx.com`), the `fetchOrigin` function does:

```text
var r = await fetch(request);   // ← passes the ORIGINAL request unchanged
```

When the Worker is bound via **Custom Domain bindings**, Cloudflare resolves `eclipserblx.com` back to **the same Worker**, creating an infinite loop. Cloudflare detects this and returns a **522 timeout**.

Compare this to the **store subdomain** branch (line 84-108), which correctly rewrites the URL to `ORIGIN_URL` (`roleplay-hub-shop.lovable.app`). The main domain branch skips this rewrite entirely.

```text
Request flow (BROKEN):
  Browser → eclipserblx.com → CF Worker → fetch(eclipserblx.com) → CF Worker → loop → 522

Request flow (FIXED):
  Browser → eclipserblx.com → CF Worker → fetch(roleplay-hub-shop.lovable.app) → Lovable origin → 200
```

## The Fix

**One change** in `buildWorkerScript()` inside `deploy-cloudflare-worker/index.ts`: rewrite the main-domain `fetchOrigin` path to always fetch from the explicit origin URL, exactly like the store subdomain path already does.

### Current code (lines 110-114 of the generated script):
```js
// Main domain - normal passthrough
var r = await fetch(request);
var h = new Headers(r.headers);
h.set("X-Eclipse-Worker", tag);
return new Response(r.body, { status: r.status, headers: h });
```

### New code:
```js
// Main domain - rewrite to origin to avoid Custom Domain loop
var originUrl = ORIGIN_URL + url.pathname + url.search;
var newReq = new Request(originUrl, {
  method: request.method,
  headers: request.headers,
  body: request.body,
  redirect: "manual"
});
newReq.headers.set("X-Forwarded-Host", hostname);
var r = await fetch(newReq);
var h = new Headers(r.headers);
h.set("X-Eclipse-Worker", tag);
h.delete("Location");
return new Response(r.