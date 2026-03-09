

## Performance Optimization Plan

### Current State
The codebase is already well-optimized with lazy-loaded routes, code splitting, deferred Sentry, preloaded fonts/hero images, critical CSS inlining, and efficient caching strategies. The PageSpeed API quota is currently exhausted so I can't get exact scores, but based on the code audit, here are the remaining optimization opportunities.

### Optimizations to Implement

#### 1. Remove `willChange` from always-visible elements
`PageTransition` and `ScrollReveal` set `willChange: 'opacity, transform'` permanently. This promotes every page and every scroll-revealed section to its own GPU layer, consuming VRAM and hurting compositing on low-end devices. Best practice: only set `willChange` briefly before animation, or remove it entirely since framer-motion handles GPU promotion automatically.

**Files:** `PageTransition.tsx`, `ScrollReveal.tsx`

#### 2. Defer non-critical above-the-fold providers
`GlobalBackground` renders an SVG noise texture filter on every page load. The inline SVG data URI triggers an immediate paint. Replace the fractal noise with a simpler CSS approach or make it load after FCP.

**File:** `GlobalBackground.tsx` — use a tiny static noise PNG instead of inline SVG filter (SVG filters are render-blocking)

#### 3. Reduce initial JS by lazy-loading `embla-carousel` in PromotionCarousel
`PromotionCarousel` imports `embla-carousel-react` and `embla-carousel-autoplay` synchronously on the landing page critical path. These should be lazy-loaded since the carousel is below the hero text.

**File:** `Landing.tsx` — wrap PromotionCarousel in a dynamic import

#### 4. Add `fetchpriority="low"` to below-fold images
Product images in `MarketplaceSection` use `loading="lazy"` but lack `fetchpriority="low"`, which would further deprioritize their network requests during initial load.

**File:** `MarketplaceSection.tsx`

#### 5. Remove permanent `will-change` CSS classes
The `.gpu-accelerated` utility class in `index.css` applies `transform: translateZ(0)` permanently. Audit usage and remove if applied to static elements.

**File:** `index.css`

#### 6. Add `content-visibility: auto` to below-fold sections
The marketplace section is already lazy-loaded via `LazySection`, but once rendered it's a large DOM tree. Adding `content-visibility: auto` with `contain-intrinsic-size` will skip layout/paint for off-screen portions.

**File:** `MarketplaceSection.tsx` wrapper

#### 7. Optimize `FeaturedProductsCard` region flag imports
Four static flag images are imported at the top level regardless of whether they're needed. Convert to dynamic imports or inline the flags as small data URIs.

**File:** `FeaturedProductsCard.tsx`

### Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `PageTransition.tsx` | Remove `willChange` style | Less GPU memory, faster compositing |
| `ScrollReveal.tsx` | Remove `willChange` style | Same — framer handles this |
| `GlobalBackground.tsx` | Replace SVG filter noise with CSS or static asset | Faster FP/FCP |
| `Landing.tsx` | Lazy-import `PromotionCarousel` | Smaller initial JS bundle |
| `MarketplaceSection.tsx` | Add `content-visibility: auto` to wrapper | Skip offscreen layout work |
| `FeaturedProductsCard.tsx` | Lazy-load region flag images | Reduce initial bundle ~20KB |
| `index.css` | Remove `.gpu-accelerated` if unused or make conditional | Reduce layer promotion |

