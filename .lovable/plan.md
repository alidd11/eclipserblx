
Issue re-stated:
- Still failing on normal Safari + installed PWAs, while private mode works.
- This points to persistent client/edge cache + service worker lifecycle, not core auth logic.

Do I know what the issue is? Yes.

What I confirmed:
1) `https://eclipserblx.com/sw.js` is still serving an old worker build (`eclipse-v4` + precached `index.html`), while `https://roleplay-hub-shop.lovable.app/sw.js` serves the new build (`eclipse-v5`).
2) `https://eclipserblx.com/sw.js?cb=...` returns the new build (`eclipse-v5`) immediately.
   - This proves exact-path `/sw.js` is cached stale on the custom-domain path.
3) `https://eclipserblx.com/offline.html` returns the Cloudflare worker 404 page.
   - But `public/custom-sw.js` install currently does `cache.add('/offline.html')` without fallback.
   - If that request is non-2xx, SW install/update can fail, leaving users stuck on old SW behavior.

Root cause:
- A custom-domain edge caching + worker-route mismatch is preventing reliable SW upgrade.
- Old/stale `/sw.js` and failing `/offline.html` caching step keep Safari/PWA clients pinned in bad startup state.

Implementation plan:

1) Fix custom-domain worker route handling for PWA bootstrap assets
- File: `supabase/functions/deploy-cloudflare-worker/index.ts`
- In generated worker script:
  - Explicitly allow/pass-through PWA bootstrap files before route validation:
    - `/sw.js`, `/custom-sw.js`, `/registerSW.js`, `/offline.html`, `/manifest.webmanifest`, `/manifest-admin.json`
  - Add explicit no-store/no-cache response headers for SW bootstrap files (`sw.js`, `custom-sw.js`, `registerSW.js`) so browsers revalidate.
  - Keep SPA route validation for unknown HTML routes, but do not block the PWA bootstrap files.

2) Stop Cloudflare aggressive JS caching from pinning `/sw.js`
- File: `supabase/functions/cloudflare-pro-optimize/index.ts`
- Update cache rules so the “Cache static assets aggressively” expression excludes:
  - `/sw.js`, `/custom-sw.js`, `/registerSW.js`, `/offline.html`, `/manifest.webmanifest`, `/manifest-admin.json`
- Add a high-priority explicit bypass/no-cache rule for these bootstrap files.
- Keep aggressive caching for hashed `/assets/*` chunks and fonts/images.

3) Make custom SW install resilient even if offline page fetch fails
- File: `public/custom-sw.js`
- Replace raw `cache.add('/offline.html')` install step with guarded logic:
  - Try fetch+cache `/offline.html`
  - If unavailable/non-2xx, cache an inline fallback response instead
- This guarantees SW install does not fail due one bad bootstrap asset path.

4) Apply runtime infra updates (post-code deployment)
- Run worker deployment flow so updated script is actually pushed to custom domain.
- Run Cloudflare optimize/fix flow to apply corrected cache rule expressions.
- Purge custom-domain edge cache (full purge once) so stale `/sw.js` is evicted immediately.

5) Verification checklist (must pass before closing)
- `eclipserblx.com/sw.js` (without query params) must show `eclipse-v5` (or newer), not v4.
- `eclipserblx.com/offline.html` must return 200 offline page, not worker 404.
- Cold open tests:
  - Safari normal tab x5
  - Installed customer PWA x5
  - Installed admin PWA x5
- Confirm no black screen/stuck loader on first open and no route crash loop.

6) Safety/backout
- No database schema changes needed.
- If any regression appears, temporarily disable custom-domain worker route and serve direct published domain while worker rules are corrected (short-term containment only).

Technical details:
- Files to update:
  - `supabase/functions/deploy-cloudflare-worker/index.ts`
  - `supabase/functions/cloudflare-pro-optimize/index.ts`
  - `public/custom-sw.js`
- No authentication model change, no RLS change, no migration required for this fix.
