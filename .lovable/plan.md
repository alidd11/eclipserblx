

# Fix Recurring RouteErrorBoundary Crashes on Published Site

## Problem

On the published site (eclipserblx.com), navigating to product pages and certain sidebar pages triggers the RouteErrorBoundary error screen. This happens because:

1. The service worker (`custom-sw.js`) has a **fatal bug** -- duplicate `const` declarations that crash it in strict mode
2. After deployments, browsers with cached HTML try to load old JS chunk files that no longer exist on the server
3. Lazy-loaded routes have no retry mechanism, so a failed chunk import immediately crashes the page

## Root Cause Analysis

```text
User opens site -> cached HTML references old JS chunks
                -> browser requests old chunk file (404)
                -> lazy import() rejects
                -> RouteErrorBoundary catches error
                -> shows "This page encountered an error"

Service Worker should prevent this by serving fresh HTML,
but custom-sw.js crashes on boot due to duplicate const declarations,
so navigation handler never registers.
```

## Plan

### Step 1: Fix the Service Worker crash

**File: `public/custom-sw.js`**

Remove the duplicate `const OFFLINE_CACHE` and `const OFFLINE_URL` declarations on lines 10-11. These duplicate lines 5-6 and crash the entire service worker in strict mode, preventing the navigation handler from ever registering.

### Step 2: Add retry logic to lazy imports

**File: `src/lib/lazyWithRetry.ts`** (new)

Create a `lazyWithRetry` wrapper that retries failed dynamic imports up to 3 times with cache-busted URLs before giving up. This handles the case where the first attempt fails due to a stale chunk reference.

### Step 3: Apply retry wrapper to all route-level lazy imports

**File: `src/components/AppRoutes.tsx`**

Replace all `lazy(() => import(...))` calls with `lazyWithRetry(() => import(...))`. This covers ~100+ route components. When a chunk fails to load, the retry wrapper will:
- Wait briefly (1 second backoff)
- Clear the module cache entry
- Retry the import

### Step 4: Improve the RouteErrorBoundary auto-recovery for chunk errors

**File: `src/components/RouteErrorBoundary.tsx`**

When a chunk error is detected, instead of showing the error UI and waiting for user action, perform an inline retry of the failed route by resetting the boundary state. Only show the error UI after the retry mechanism in Step 2 has exhausted all attempts.

### Step 5: Add Cloudflare cache headers for hashed assets

**File: `supabase/functions/deploy-cloudflare-worker/index.ts`**

Update the Cloudflare Worker's `fetchOrigin` function to add `Cache-Control: public, max-age=31536000, immutable` headers for content-hashed asset files (`/assets/*.js`, `/assets/*.css`). This ensures browsers cache these files permanently (they have unique hashes per build), reducing the window where stale references can cause failures.

### Step 6: Purge Cloudflare cache after deployment

Trigger the existing `purge-cloudflare-cache` edge function to clear any stale assets currently cached at the edge.

## Technical Details

**`lazyWithRetry` implementation:**
```typescript
function lazyWithRetry(importFn, retries = 3) {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        // Bust module cache by appending timestamp to URL
      }
    }
    return importFn(); // final attempt
  });
}
```

**Service Worker fix:**
Lines 9-11 of `custom-sw.js` are exact duplicates of lines 4-6 and must be removed.

## Expected Outcome

- Service worker correctly registers its navigation handler, always serving fresh `index.html` from the network
- Failed lazy imports retry automatically 3 times before giving up
- Hashed assets get immutable cache headers, preventing mid-session cache eviction
- Edge cache is purged so no stale assets are served
- Users will no longer see the RouteErrorBoundary on product pages or sidebar navigation

