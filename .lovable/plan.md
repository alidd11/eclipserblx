

## Why Ghost URLs Get Indexed & How to Fix It

### The Problem

Your app **never existed** with a `/forum/` section. These phantom URLs appear in Google because:

1. **Bots probe common paths** (`/forum/`, `/blog/`, `/wp-admin/`) on every domain
2. **Your SPA always returns HTTP 200** — even for the NotFound page. Google sees "200 OK" and treats it as a real page
3. The `noindex` meta tag on your NotFound page helps *eventually*, but Google is slow to process client-side meta tags from SPAs

The real fix is two-pronged: block known dead paths from crawling, and handle them at the **Cloudflare Worker level** to return a proper **410 Gone** status before the request even reaches your app.

### Plan

**1. Update `robots.txt` — block known dead path prefixes**

Add disallow rules for paths that never existed:

```
Disallow: /forum/
Disallow: /blog/
Disallow: /wp-admin/
Disallow: /wp-content/
```

This prevents future crawling but won't remove already-indexed pages.

**2. Update the Cloudflare Worker (`eclipse-og-proxy`) to return HTTP 410 for dead paths**

Add a check at the top of the worker: if the path starts with any known dead prefix (`/forum/`, `/blog/`, `/wp-admin/`, etc.), immediately return **HTTP 410 Gone**. This tells Google the content is permanently removed and triggers fast deindexing.

Since the Cloudflare Worker is outside this codebase (manual config), I'll provide you the exact code snippet to add.

**3. Manual step: Google Search Console URL Removal**

Submit removal requests for `eclipserblx.com/forum/` (prefix) in Google Search Console → Removals → New Request. This takes effect within hours.

### What changes in code

| File | Change |
|---|---|
| `public/robots.txt` | Add `Disallow` for `/forum/`, `/blog/`, `/wp-admin/`, `/wp-content/` |

Plus I'll give you the Cloudflare Worker snippet for the 410 response.

