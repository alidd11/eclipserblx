

# Professional Native Website Enhancements

After auditing the codebase, the site already has strong foundations (View Transitions, haptics, optimistic UI, structured data, prefetching, scroll restoration, pull-to-refresh). Here are the remaining gaps to close for a truly professional, native-feeling website.

---

## 1. Scroll-direction-aware header (auto-hide on scroll down)

Native apps and modern websites (Medium, Twitter, YouTube mobile) hide the header when scrolling down and reveal it on scroll up. This reclaims screen real estate on mobile.

- Create a `useScrollDirection` hook that tracks scroll delta
- Apply a CSS transform to the header: `translateY(-100%)` on scroll-down, `translateY(0)` on scroll-up
- Use `will-change: transform` and CSS transitions for 60fps performance
- Only activate below the `md` breakpoint (mobile/tablet)

**Files**: new `src/hooks/useScrollDirection.ts`, edit `src/components/layout/Header.tsx`, edit `src/components/layout/LayoutShell.tsx`

---

## 2. Global offline/online connectivity banner

The app detects offline in `QueryErrorState` but has no global notification. Professional sites show a persistent toast or banner when connectivity drops and a success toast when it returns.

- Create a `useConnectivityBanner` hook that listens to `online`/`offline` events
- Show a fixed bottom banner (not toast) when offline: "You're offline -- some features may be unavailable"
- Show a brief success toast when connection restores
- Add to `App.tsx` at the top level

**Files**: new `src/hooks/useConnectivityBanner.tsx`, edit `src/App.tsx`

---

## 3. Respect `prefers-reduced-motion` globally

Currently only View Transitions respect this. All CSS animations (`animate-page-in`, `shimmer`, `route-enter`, nav progress bar) should be disabled when the user prefers reduced motion.

- Add a single `@media (prefers-reduced-motion: reduce)` block in `index.css` that sets `animation-duration: 0s !important` and `transition-duration: 0s !important` on `*`
- This is a one-line CSS change with massive accessibility impact

**Files**: edit `src/index.css`

---

## 4. Smooth image loading with fade-in

Images currently pop in abruptly when loaded. Professional sites fade images in from a background placeholder.

- Add a global CSS rule: `img { opacity: 0; transition: opacity 0.3s; } img[complete], img.loaded { opacity: 1; }`
- Use the `onLoad` event or a tiny `useImageLoaded` utility to add the `.loaded` class
- Apply a `bg-muted` placeholder on all image containers (most already have this)

**Files**: edit `src/index.css` (add image fade rules), optionally a tiny `src/hooks/useImageLoaded.ts`

---

## 5. Stale data background refresh indicator

When react-query silently refetches in the background, there's no visual cue. Native apps show subtle spinners or shimmer overlays.

- Use `useIsFetching()` from `@tanstack/react-query` to detect background fetches
- Show a tiny pulsing dot or thin bar near the navigation progress area
- Very subtle -- just enough to signal "data is being updated"

**Files**: new `src/components/BackgroundRefreshIndicator.tsx`, edit `src/App.tsx`

---

## 6. Network-aware image quality

Adapt image quality based on connection speed using `navigator.connection.effectiveType`. On slow connections (`2g`, `slow-2g`), load lower-resolution images via the existing `optimizeImageUrl` utility.

- Create `src/hooks/useNetworkQuality.ts` that reads `navigator.connection`
- Expose a `quality` value (`low` | `medium` | `high`)
- Thread this into `optimizeImageUrl` to reduce image dimensions on slow connections
- Progressive enhancement -- falls back to high quality when API unavailable

**Files**: new `src/hooks/useNetworkQuality.ts`, edit `src/utils/optimizeImageUrl.ts`

---

## 7. Viewport-based link prefetching

Currently `PrefetchLink` only prefetches on hover/focus. On mobile there's no hover. Prefetch links when they scroll into the viewport using `IntersectionObserver`.

- Enhance `PrefetchLink` to also observe the element's intersection with the viewport
- When the link enters the viewport (with a `rootMargin` of `200px`), trigger prefetch
- This makes mobile navigation feel instant -- the page is already cached before the user taps

**Files**: edit `src/components/PrefetchLink.tsx`

---

## Summary

| Enhancement | Impact | Effort |
|---|---|---|
| Auto-hide header on scroll | High (mobile UX) | Medium |
| Offline/online banner | Medium (resilience) | Low |
| Reduced motion global | High (accessibility) | Trivial |
| Image fade-in | Medium (polish) | Low |
| Background refresh indicator | Low (subtle polish) | Low |
| Network-aware images | Medium (perf on slow networks) | Low |
| Viewport-based prefetch | High (mobile perf) | Low |

All changes are progressive enhancements -- they improve the experience without breaking anything on unsupported browsers.

