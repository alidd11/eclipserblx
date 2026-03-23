
Issue confirmed and explicit root cause:
1) Custom domain is still serving stale Service Worker bootstrap (`/sw.js` = `eclipse-v4`) while published origin serves `eclipse-v5`.
2) `offline.html` on custom domain is not reliably served by origin pathing (seen as cached 404 previously; uncached probes now hitting 522).
3) This is now infrastructure/cache lifecycle, not auth bootstrap: there are no recent `bad_jwt`/`missing sub claim` auth errors.
4) There is a high-risk ops gap: the `test-worker-alive` function can overwrite the production worker script and cause origin-loop/522 behavior on uncached paths.

Implementation plan (to fully resolve disruption):

1) Emergency stabilization (first)
- Redeploy the full production Cloudflare worker via `deploy-cloudflare-worker` immediately (restore known-good script pathing).
- Run `cloudflare-pro-optimize` and `purge-cloudflare-cache` in sequence.
- Verify uncached probes:
  - `https://eclipserblx.com/sw.js?cb=<ts>` returns 200 and `eclipse-v5` (or newer).
  - `https://eclipserblx.com/offline.html?cb=<ts>` returns 200 (not 404/522).
  - Product route uncached probe returns 200 (no 522).

2) Remove the infrastructure footgun
- Update `supabase/functions/test-worker-alive/index.ts` so it no longer deploys/replaces the production worker.
- Convert it to read-only diagnostics (header checks only), or hard-block it behind an explicit `allow_mutation` guard that defaults to false.
- Apply same safety policy to any other “test” functions that can mutate worker scripts/routes.

3) Make worker deployment self-verifying (atomic deploy)
- Update `supabase/functions/deploy-cloudflare-worker/index.ts` to include post-deploy health checks before returning success:
  - `sw.js?cb=<ts>` contains expected cache prefix (`eclipse-v5+`) and excludes precached `index.html`.
  - `offline.html?cb=<ts>` returns 200.
  - critical route (`/products/<known-id>?cb=<ts>`) returns non-5xx.
- If checks fail, return failure status with diagnostics instead of false-positive “success”.

4) Harden cache policy against stale bootstrap pinning
- Keep/ensure explicit no-cache bypass for:
  - `/sw.js`, `/custom-sw.js`, `/registerSW.js`, `/offline.html`, `/manifest.webmanifest`, `/manifest-admin.json`.
- Ensure aggressive cache rule excludes all above files (including manifests/offline).
- Keep hashed `/assets/*` aggressive caching intact.

5) Force client-side migration safely
- Bump PWA cache namespace and custom SW version together (next patch bump, e.g. `eclipse-v6` + `SW_VERSION 1.1.1`) so surviving clients get a hard cache boundary.
- Keep resilient install fallback for offline page.
- Optionally bump `app_version.version` (without permanent `force_update`) to help fresh-version convergence once worker path is stable.

6) Validation matrix (must pass before closure)
- Custom domain checks:
  - `/sw.js` and `/sw.js?cb=` both return same latest worker generation.
  - `/offline.html` and `/offline.html?cb=` both return 200.
  - `/products/13?cb=` returns 200.
- UX checks:
  - Safari normal tab cold open x5
  - installed customer PWA cold open x5
  - installed admin PWA cold open x5
- Acceptance:
  - no black screen,
  - no startup 5xx,
  - no stale-v4 worker on custom domain.

Files to update:
- `supabase/functions/deploy-cloudflare-worker/index.ts`
- `supabase/functions/cloudflare-pro-optimize/index.ts` (if any rule gaps remain)
- `supabase/functions/test-worker-alive/index.ts`
- `public/custom-sw.js` (version bump only, if required by migration step)
- `vite.config.ts` (cacheId bump only, if required by migration step)

Why this plan will resolve it:
- It fixes the actual failing layer (custom-domain worker + edge cache), not already-stable auth logic.
- It adds deployment-time verification so this exact stale/false-success outage can’t silently recur.
- It removes the main operational hazard that can re-break production during diagnostics.
