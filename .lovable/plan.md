

## Google Search Console — Page Indexing Issues Explained

### What you're seeing
Google has crawled eclipserblx.com and found 10 categories of pages it chose **not to index**. Here's what each one means and whether we need to fix it:

---

### 1. Page with redirect
Google found pages that redirect (301/302) to another URL. This is **expected and fine** — your codebase has intentional legacy redirects (e.g. `/admin/income` → `/admin/revenue`, `/live-chat` → `/support/chat`). **No action needed.**

### 2. Redirect error
A redirect chain is broken or loops. Could be caused by Cloudflare rules conflicting with your app's redirects. **Needs investigation** — click this in Search Console to see which URLs are affected.

### 3. Server error (5xx)
Google got a 500 error when trying to load some pages. This is likely from the SPA returning errors on routes that require authentication or data that doesn't exist. **Needs investigation** — check which URLs.

### 4. Not found (404)
Pages that returned a 404. Since this is an SPA, your `NotFound.tsx` correctly sets `noindex` — this is **expected** for deleted products/stores or old URLs. **No action needed** unless real pages are 404ing.

### 5. Blocked due to other 4xx issue
Pages returning 401/403 (unauthorized). Likely admin/seller/account pages that Google tried to crawl despite `robots.txt` disallow rules. Googlebot sometimes discovers these through internal links. **Mostly expected.**

### 6. Soft 404
Google loaded a page but the content looked like a "not found" page even though it returned HTTP 200. This is common in SPAs — if a product/store is deleted, the React app may show "not found" content but still return 200 from the server. **This is a real issue to fix.**

### 7. Duplicate without user-selected canonical
Google found multiple URLs with the same content and no canonical tag distinguishing them. Your `usePageMeta` hook sets canonicals **client-side**, but Google's crawler may not always execute JavaScript. The `index.html` has a hardcoded canonical to `/` which means **every page initially tells Google its canonical is the homepage**. **This is a significant SEO issue.**

### 8. Alternative page with proper canonical tag
Google found pages that point to another URL via canonical. This is **informational, not an error** — it means Google is correctly following your canonical tags.

### 9. Crawled - currently not indexed
Google crawled the page but decided it wasn't worth indexing (low quality/value signal). Common for thin pages. **Review which pages** — may need better content.

### 10. Discovered - currently not indexed
Google knows about these URLs but hasn't bothered to crawl them yet. Usually resolves over time as domain authority grows. **No action needed.**

---

### Key fixes to implement

#### Fix 1: Server-side canonical tags via Cloudflare Worker
The biggest issue is **#7 (Duplicate without canonical)**. Currently the canonical is hardcoded to `/` in `index.html` and only updated client-side by JavaScript. Googlebot may not execute JS reliably. The Cloudflare Worker that already serves the initial HTML should inject the correct `<link rel="canonical">` based on the request path.

#### Fix 2: Proper 404 status codes
For **#6 (Soft 404)**, the Cloudflare Worker should return HTTP 404 status for pages that match known non-existent patterns, rather than always returning 200.

#### Fix 3: Add `X-Robots-Tag: noindex` headers for private routes
For **#5 (4xx issues)**, the Cloudflare Worker should add `X-Robots-Tag: noindex` HTTP headers for `/admin/`, `/seller/`, `/account/`, `/auth` paths — reinforcing the `robots.txt` rules.

#### Fix 4: Investigate specific URLs
For **#2 (Redirect error)** and **#3 (Server error)**, you need to click into each category in Search Console and share the specific URLs so we can debug them.

---

### Technical details

**Files to modify:**
- **Cloudflare Worker** (or create a new edge function): Inject correct `<link rel="canonical" href="https://eclipserblx.com{path}">` into the HTML response based on the request URL path
- **`index.html`**: Remove the hardcoded canonical (or keep as fallback) since the Worker will handle it
- **`robots.txt`**: Already well-configured, no changes needed
- **`usePageMeta.ts`**: Keep as-is for client-side updates (works for users and JS-capable crawlers)

### Recommended next step
Click into the **Redirect error**, **Server error (5xx)**, and **Soft 404** categories in Search Console and share the affected URLs so I can pinpoint the exact cause for each.

