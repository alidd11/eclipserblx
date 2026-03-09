

## PageSpeed Insights Optimization Plan

Based on the screenshots, here are the actionable issues and what can be fixed in code:

### Issues Identified

1. **Image delivery (1,359 KiB savings)**
   - `hero-bg-mobile.webp` is 742x768 but displayed at 735x420 — oversized
   - Logo icon is 1024x1024 but displayed at 24x24 — massively oversized
   - Product images from storage not using `optimizeImageUrl` in featured showcase

2. **Unused preconnects**
   - `storage.googleapis.com` preconnect is unused (only used for OG image, not during page load)
   - Supabase preconnect missing `crossorigin` attribute

3. **Missing preconnect for Discord**
   - `discord.com` is called on page load (310ms savings) but has no preconnect

4. **LCP element render delay: 3,180ms**
   - The LCP element is a store description text `<p>`, not the hero image. This means JS must execute, data must fetch, and React must render before LCP fires. The main fix is reducing JS parse time and deferring non-critical work.

5. **Legacy JavaScript (Sentry Array.from — 11 KiB)**
   - Sentry bundle includes polyfills. Can increase build target or exclude via Sentry config.

6. **Forced reflow (32ms react-vendor, 30ms radix)**
   - Mostly framework-internal; limited direct fix, but reducing initial DOM complexity helps.

7. **57 non-composited animations**
   - Framer Motion animations on landing page sections likely using `top`/`left`/`opacity` without `will-change` or GPU-accelerated transforms.

8. **Reduce unused CSS (21 KiB)**
   - Single CSS bundle includes styles for all routes. Already using `cssCodeSplit: true` but Tailwind generates all utilities upfront.

### Plan

#### 1. Fix image sizing issues
- Resize `hero-bg-mobile.webp` to exactly 735x420 (or serve via `<picture>` with `sizes`)
- Add `width`/`height` attributes matching actual display size
- For the logo icon: generate a small 96x96 version of `marketplace-logo-icon.webp` and use it in `EclipseLogo.tsx` for `xs`/`sm`/`md` sizes. Or use `optimizeImageUrl` if it were a storage URL (it's a bundled asset, so a smaller source file is needed).

#### 2. Fix preconnects in `index.html`
- Remove unused `storage.googleapis.com` preconnect
- Add `crossorigin` to the Supabase preconnect (needed for CORS fetch requests)
- Add `<link rel="preconnect" href="https://discord.com">` since Discord API is called on every page load

#### 3. Reduce LCP render delay
- The Discord API call on the homepage blocks rendering. Move `useDiscordStats` fetch to a lower priority or defer it with `setTimeout` / `requestIdleCallback` so it doesn't compete with initial render.
- Lazy-load landing page sections below the fold (categories, trust signals, store spotlight) to reduce initial JS evaluation.

#### 4. Optimize Sentry for modern browsers
- Already targeting `es2022` in build config. The `Array.from` in Sentry is from the library itself. Can add Sentry to `build.target` exclude or accept the 11 KiB as minimal impact.

#### 5. Fix non-composited animations
- Add `will-change: transform` or use `transform` instead of `y` offset in framer-motion variants where possible. Ensure `PageTransition` and landing section animations use GPU-composited properties only.

#### 6. Defer CSS loading (already implemented)
- The `defer-css` plugin is already in place. The 21 KiB unused CSS is from Tailwind — can be reduced with a PurgeCSS pass but Tailwind already tree-shakes via `content` config.

### Implementation Summary

| Change | File(s) | Impact |
|--------|---------|--------|
| Resize hero-bg-mobile or add responsive `sizes` | `HeroBanner.tsx` | ~500 KiB savings |
| Create small logo variant (96px) | `EclipseLogo.tsx`, new asset | ~200 KiB savings |
| Fix preconnects | `index.html` | ~300ms LCP improvement |
| Defer Discord fetch | `useDiscordStats.ts` | Reduce render blocking |
| Lazy-load below-fold sections | Landing page components | Reduce initial JS eval |
| GPU-accelerate animations | `PageTransition.tsx`, landing components | Fix 57 non-composited animations |

