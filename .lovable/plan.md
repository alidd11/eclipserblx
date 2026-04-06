
# Enterprise Performance Optimization Plan

## Phase 1: Vendor Bundle Splitting (Low risk, high cache benefit)
Split large libraries into separate chunks so browser caches them independently — a React update won't invalidate the Framer Motion chunk.

**Changes:**
- `vite.config.ts` — Add manual chunks for `react-hook-form/zod`, `i18next`, `@sentry`, `framer-motion`, `@supabase`, `@radix-ui`

**Checkpoint 1:** Run `npx vite build` → verify chunk sizes, no errors, no duplicate React instances.

---

## Phase 2: Image CDN via `optimizeImageUrl` (Medium risk, biggest LCP win)
Activate Supabase image transforms in `optimizeImageUrl` so product images are served resized + WebP instead of full-size originals. Uses the existing `/storage/v1/render/image/` endpoint pattern with a safe fallback.

**Changes:**
- `src/utils/optimizeImageUrl.ts` — Implement width/height/quality params, connection-aware quality reduction, retina support
- Update test file to match new behavior

**Checkpoint 2:** Run tests (`vitest run optimizeImageUrl`), verify build passes.

---

## Phase 3: Route-Level Data Prefetching (Low risk, perceived speed)
Extend existing `PrefetchLink` + `usePrefetchProduct` pattern so category pages and store pages also prefetch their data on hover/viewport entry.

**Changes:**
- `src/hooks/usePrefetchProduct.ts` — Already done, no changes needed
- `src/components/PrefetchLink.tsx` — Already supports `prefetchFn`, no changes needed
- Create `src/hooks/usePrefetchRoute.ts` — Generic hook that prefetches query data for known route patterns (e.g., `/category/:slug` → prefetch category products, `/store/:slug` → prefetch store data)

**Checkpoint 3:** Build passes, no console errors on homepage hover interactions.

---

## Phase 4: Predictive Role-Based Preloading (Low risk, seller/admin speed)
After auth resolves, prefetch role-specific data in the background so dashboards load instantly.

**Changes:**
- Create `src/hooks/usePredictivePreload.ts` — After login, if user has a store → prefetch seller dashboard stats; if admin → prefetch admin overview data

**Checkpoint 4:** Build passes, no unnecessary queries fired for regular customers.

---

## Final Checkpoint
- Full production build with no warnings
- Run existing test suite
- Verify no increase in initial bundle size (check main chunk)

## What This Does NOT Change
- No UI changes
- No database changes
- No new dependencies
- All changes are additive with safe fallbacks
