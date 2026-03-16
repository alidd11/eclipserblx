
Goal: stop the persistent “Something Went Wrong” loop on Admin PWA (Safari/WebKit), especially when `?__chunk=` is present.

1) Findings from investigation
- The error screen in your screenshot matches `ConnectionErrorBoundary` (“Something Went Wrong” variant).
- `PWARouteRestorer` only strips volatile params (`__chunk`, `__v`, `__t`, `__ra`) when path is `/`.  
  Admin PWA launches on `/admin`, so `__chunk` can remain stuck.
- Chunk recovery detection is currently broad (`failed to fetch`, `networkerror`), which can misclassify normal transient fetch failures as chunk failures and trigger unnecessary hard reloads.
- Admin startup path still includes `forwardRef` in critical launch components (`src/pages/admin/Login.tsx`, `src/components/admin/AdminInstallPrompt.tsx`), and there are additional route-entry `forwardRef`s that can be brittle in Safari/WebKit.
- Backend version row still has `force_update = true` on `app_version` (v1.0.83), which can amplify reload churn on devices with weak local persistence.

2) Implementation plan (what I will change)
A. Fix URL sanitation for Admin PWA launch
- Update `PWARouteRestorer` to always sanitize the current URL in standalone mode (not only `/`), removing `__chunk`, `__v`, `__t`, `__ra` on first boot.
- Keep route restoration behavior, but run restoration logic after sanitation.
- Ensure stored last route is rewritten sanitized if dirty.

B. Tighten chunk-recovery triggers (reduce false positives)
- In `src/lib/chunkErrorHandler.ts`:
  - Remove generic patterns like plain `failed to fetch` / `networkerror`.
  - Only trigger on explicit chunk/module patterns (dynamic import/module script/chunk mime/chunkloaderror).
  - Require either chunk-specific message OR chunk asset URL evidence.
- In `src/components/ConnectionErrorBoundary.tsx`:
  - Align chunk detection with stricter chunk-only patterns.
  - Keep fallback UI, but avoid hard reload recovery on generic network fetch errors.

C. Safari/WebKit compatibility hardening for critical entry components
- Convert these from `forwardRef` to plain function components (no behavior change):
  - `src/pages/admin/Login.tsx`
  - `src/components/admin/AdminInstallPrompt.tsx`
  - `src/pages/Index.tsx`
  - `src/pages/Landing.tsx`
  - `src/components/auth/EmailGuard.tsx`
  - `src/components/pwa/InstallPrompt.tsx` (same treatment for consistency)
- Preserve exports and props so routing and lazy imports remain unchanged.

D. Reduce forced-update churn
- Adjust `useAppVersionCheck` bootstrap path so first-run/missing-local-version doesn’t repeatedly force hard reload loops.
- After code deploy, set `app_version.force_update` back to `false` to stop repeated forced reload pressure while we stabilize Safari behavior.

3) Validation plan
- Reproduce critical flows:
  - Launch Admin path with `?__chunk=...` and confirm it gets sanitized on first render.
  - Refresh Admin route repeatedly and confirm no automatic `__chunk` loop.
  - Confirm normal offline/network failures show connection messaging without chunk hard-reload escalation.
- PWA checks:
  - Open Admin PWA from home screen, cold launch and relaunch.
  - Verify login screen/dashboard no longer falls into immediate global boundary.
- Runtime checks:
  - Inspect console for reduced chunk recovery triggers and absence of repeated force-update reload messages.

4) Expected outcome
- Admin PWA no longer gets stuck on cache-busted URLs.
- Fewer false chunk recoveries from normal fetch/network noise.
- Improved Safari stability on Admin startup/render path.
- No persistent forced-update reload churn after rollout.
