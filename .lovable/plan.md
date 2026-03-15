

## Performance Fixes

Based on the profiling results, your FCP is **5360ms** (target: < 1800ms) and full load is **5432ms**. While some of this is dev-mode overhead (92 separate module scripts), there are real issues to fix that will impact production Lighthouse scores.

### Issues Found

1. **`defer-css` Vite plugin** — Rewrites all CSS `<link>` tags to `media="print"` with an `onload` swap. This **delays all styles until after JS runs**, causing a flash of unstyled content and inflating FCP/LCP. Above-the-fold CSS should NOT be deferred.

2. **Hero image `decoding="async"`** — The hero is the LCP element. Using `decoding="async"` tells the browser it can defer decoding, which delays LCP. Should be removed (default `auto` is fine with `fetchPriority="high"`).

3. **`useSellerStatus` in LandingHero** — Fires a database query on every page load just to conditionally show a "Start selling" link. This blocks the hero render for unauthenticated visitors (the vast majority).

4. **Missing `loading="eager"` on LCP image** — Explicit eager loading ensures the browser doesn't accidentally lazy-load the hero.

5. **`useScheduledReleaseCheck` in MainLayout** — Runs on every page including landing. Non-critical polling that adds to initial JS execution.

### Changes

**1. `vite.config.ts`** — Remove the `defer-css` plugin entirely. CSS code-splitting is already enabled, and critical styles are inlined in `index.html`. The plugin hurts more than it helps.

**2. `src/components/landing/HeroBanner.tsx`** — Remove `decoding="async"`, add `loading="eager"` to ensure the LCP image loads immediately.

**3. `src/components/landing/LandingHero.tsx`** — Remove `useSellerStatus` from the hero. Show the "Start selling" link unconditionally (it's fine for sellers to see it — it redirects to their dashboard). This eliminates a blocking DB query.

**4. `src/components/layout/MainLayout.tsx`** — Wrap `useScheduledReleaseCheck` so it defers (e.g., only runs after a 5-second delay or uses `requestIdleCallback`) instead of firing immediately on mount.

**5. `index.html`** — Add `rel="preload"` for the main CSS bundle (if identifiable) or ensure the existing inline critical CSS covers the hero fully.

These are targeted fixes that address the real bottlenecks without major refactoring.

