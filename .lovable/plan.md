

## Fix: Custom Domain System (1014 Error + Worker Immutable Headers)

Two distinct bugs are reported by your user:

### Problem 1: Error 1014 "Cross User Banned"
When a store owner's custom domain is on Cloudflare **and** they proxy (orange cloud) the CNAME to `stores.eclipserblx.com`, Cloudflare sees two proxied zones for the same hostname and blocks with error 1014. This is a fundamental Cloudflare for SaaS constraint -- customer domains **must use DNS-only (grey cloud)** for the CNAME record.

### Problem 2: "Worker error: Can't modify immutable headers"
The `*.eclipserblx.com/*` Worker route catches store subdomain traffic. For non-bot requests, it returns `fetch(request)` directly. In some Cloudflare edge scenarios, the returned response has immutable headers that cause errors when the runtime tries to process them. The fix is to clone the response with `new Response(response.body, response)`.

---

### Plan

**1. Fix the Worker script (`deploy-cloudflare-worker/index.ts` -- `buildWorkerScript()`)**
- Replace all `return fetch(request)` calls with a clone pattern:
  ```js
  var r = await fetch(request);
  return new Response(r.body, { status: r.status, headers: new Headers(r.headers) });
  ```
- This creates a mutable response copy, preventing the "Can't modify immutable headers" error.

**2. Update DNS instructions in `store-domain-manager/index.ts`**
- Change the setup instructions to explicitly warn against proxying:
  ```
  step1: "Add a CNAME record: ${domain} → stores.eclipserblx.com (DNS-only / grey cloud — do NOT proxy)"
  ```

**3. Update the seller domain settings UI (`SellerSettingsDomain.tsx`)**
- Add a prominent warning in the custom domain setup instructions that if their domain is on Cloudflare, the CNAME **must** be set to DNS-only (grey cloud icon), not proxied (orange cloud). Proxied mode causes a 1014 error.

**4. Redeploy the Worker**
- After the code changes, invoke the `deploy-cloudflare-worker` function to push the fixed Worker script to Cloudflare.

