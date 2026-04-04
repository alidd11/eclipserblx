

# Instant Product Image Loading

## Problem
Product images currently load lazily with `loading="lazy"` and `decoding="async"`, meaning they only start downloading when scrolled into view. Combined with no preloading or caching strategy, users see placeholder shimmer states before images appear.

## Strategy

A multi-layered approach to make images appear as close to instantly as possible:

### 1. Eager Loading for Above-the-Fold Products
ProductCard currently uses `loading="lazy"` for all cards. The first ~4-8 visible products (above the fold) should use `loading="eager"` and `fetchPriority="high"` instead. Add an optional `priority` prop to ProductCard.

**File**: `src/components/ui/ProductCard.tsx`

### 2. Preload First Product Images via Link Headers
Inject `<link rel="preload" as="image">` tags into the document head for the first batch of product images returned by the homepage queries. This tells the browser to start fetching images immediately, even before the component renders.

**File**: New `src/hooks/usePreloadImages.ts` + integrate into landing sections

### 3. IntersectionObserver-Based Prefetching
For products just below the fold, use an IntersectionObserver with a large `rootMargin` (e.g. 400px) to start loading images before they scroll into view. Create a lightweight prefetch utility that creates an `Image()` object to warm the browser cache.

**File**: New `src/hooks/useImagePrefetch.ts`

### 4. Browser Cache Headers (Service Worker / CDN)
The images are served from Supabase storage which already has cache headers. Add a small in-memory cache map in the app to track which URLs have been loaded, preventing re-render flicker when navigating back.

**File**: `src/utils/imageCache.ts`

### 5. Landing Section Integration
Update `TrendingProducts`, `NewThisWeek`, `RecentReleases`, and `OnSaleProducts` to pass `priority={true}` for the first row of visible cards and preload their image URLs on data fetch.

**Files**: `src/components/landing/TrendingProducts.tsx`, `NewThisWeek.tsx`, `RecentReleases.tsx`, `OnSaleProducts.tsx`

### 6. Remove Unnecessary Transition Delay
The `OptimizedImage` component has a 300ms opacity transition that delays perceived load. For priority images, skip the fade-in entirely.

**File**: `src/components/ui/OptimizedImage.tsx`

---

## Technical Details

- **usePreloadImages hook**: Takes an array of URLs, injects `<link rel="preload">` into `<head>` on mount, cleans up on unmount. Limited to first 6 URLs to avoid bandwidth waste.
- **ProductCard priority prop**: When `priority={true}`, sets `loading="eager"`, `decoding="sync"`, `fetchPriority="high"`, and removes lazy intersection observer logic.
- **Image prefetch utility**: `prefetchImage(url)` creates `new Image().src = url` to warm browser cache. Called via IntersectionObserver 400px before viewport entry.
- No new dependencies required. Pure browser APIs.
- No database changes needed.

