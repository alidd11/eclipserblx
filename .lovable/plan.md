

## Root Cause (Confirmed with Evidence)

**Why private mode works but normal Safari/PWA doesn't:**

1. **`force_update` is STILL `true` in the database since March 20** — every page load triggers `window.location.reload()`, but the Service Worker serves the same stale cached HTML, creating an infinite reload loop.

2. **Workbox is still precaching `index.html`** — `globPatterns` in `vite.config.ts` still includes `html`. The custom SW's network-first handler never runs because Workbox's `navigateFallback` intercepts navigation first, serving cached (stale) HTML.

3. **SW version is still `1.0.9`** — old caches from `eclipse-v4` are never cleared.

Private/incognito has no SW and no cache → fresh HTML → works perfectly. Normal mode has SW + stale cache → old HTML → old chunk references → crash.

The Sentry error is almost certainly a chunk load failure from this same stale-cache path.

## Fix (3 changes)

### 1. Fix Service Worker config (`vite.config.ts`)
- Change `globPatterns` from `"**/*.{js,css,html,ico,png,svg,woff,woff2}"` to `"**/*.{js,css,ico,png,svg,woff,woff2}"` (remove `html`)
- Remove `navigateFallback: '/offline.html'` (the custom SW already handles offline fallback via its fetch listener)
- Change `navigateFallbackDenylist` to `[/./]` as safety net to prevent Workbox from handling ANY navigation
- Bump `cacheId` from `'eclipse-v4'` to `'eclipse-v5'`

### 2. Bump custom SW version (`public/custom-sw.js`)
- Change `SW_VERSION` from `'1.0.9'` to `'1.1.0'`
- This triggers activation → clears all old caches → network-first takes over

### 3. Reset `force_update` in database
- Run SQL: `UPDATE app_version SET force_update = false WHERE id = 'current'`
- Stops the 3-day-old infinite reload loop

### After code changes: Publish the app
This is critical — the fixes must reach the production domain.

### Why this will work
- No more stale `index.html` served from cache
- Navigation always goes to network first (custom SW handles it)
- No more force-update reload loop
- All previous auth hardening remains intact for genuine token issues

