
Goal: stop the Revenue password-refresh loop on the published iOS app (Safari + installed PWA), and prevent future reload loops.

What I found
- The symptom is highly specific: reload happens ~2 seconds after access, then returns to password gate, and eventually Safari shows the crash page.
- That 2-second timing matches the deferred app-version check (`setTimeout(checkForUpdate, 2000)`), not user interaction logic.
- Your current code in test already has the Revenue gate persistence fix, but the issue is reported on the published domain (live), which can still have different code/data state.
- Do I know what the issue is? Yes: this is most likely a live forced-update/reload loop (plus iOS PWA cache behavior amplifying it), with the password gate reset being a side effect of reloads.

Plan to implement
1) Verify and remediate live release state first (highest impact)
- Confirm live `app_version` row has `force_update = false` for `id='current'`.
- Ensure latest RevenueHub fix is actually published to live.
- If live still serves stale assets, bump SW/cache version once so clients fetch fresh bundles.

2) Harden the app-version updater against iOS storage/cache edge cases
- Add a circuit breaker in `useAppVersionCheck`:
  - If force-update reload was attempted recently, skip additional automatic reloads.
  - Persist attempt metadata in multiple safe locations (session/local + in-memory fallback).
- Keep recent-update protection reliable even when storage fails:
  - Don’t rely only on storage after URL param cleanup.
  - Preserve a runtime fallback timestamp/version before removing URL params.
- Add clear reload-reason tagging (e.g. `app_version_force_update`) for debugging.

3) Harden stale-chunk recovery path to avoid repeated hard refresh loops
- Add a cooldown/backoff in `chunkErrorHandler` so repeated module failures don’t keep hard-reloading Safari.
- Record the last chunk-reload reason/timestamp for diagnostics.

4) Reduce stale HTML risk from service worker navigation caching
- Update custom SW navigation strategy so failed network does not repeatedly serve stale HTML that references old chunks.
- Keep offline fallback, but avoid persistent stale navigation cache loops on deploy transitions.

5) Validate end-to-end on the exact failing path
- Published domain only, iPhone viewport behavior:
  - Login → `/admin/revenue` → enter password → wait >5s (past 2s check window) → confirm no reload.
  - Test both Safari tab and installed PWA.
  - Confirm no return to password gate unless inactivity timeout expires.
  - Confirm no Safari “problem repeatedly occurred” screen.

Technical details
- Files targeted:
  - `src/hooks/useAppVersionCheck.ts`
  - `src/lib/chunkErrorHandler.ts`
  - `public/custom-sw.js` (and/or PWA config path for cache/version bump)
- Optional diagnostic additions:
  - lightweight console markers for reload origin (`app_version`, `chunk_error`, manual refresh)
  - temporary breadcrumb logging around the 2-second update check
- Live rollout sequence:
  1. Apply code hardening
  2. Publish to live
  3. Set/verify live `force_update=false`
  4. Validate on device
