

## Plan: Permanent Fix for Stale Module Import Errors

**Problem**: After deployments, users with cached HTML try to import JS chunks that no longer exist (hash changed), causing `TypeError: Importing a module script failed`. This is a cache-coherence issue between old HTML and new assets.

**Two-pronged solution**:

### 1. Global error handler to auto-recover from stale imports
Add a window-level `error` + `unhandledrejection` listener that detects module import failures and forces a one-time page reload to fetch fresh HTML. This is the industry-standard pattern used by Vite/SvelteKit/Nuxt.

- **File**: `src/main.tsx` (or a new `src/lib/chunkErrorHandler.ts`)
- Uses `sessionStorage` flag to prevent infinite reload loops
- Catches both dynamic `import()` rejections and static `<script type="module">` failures

### 2. Suppress in Sentry
Add `"Importing a module script failed"` and `"Failed to fetch dynamically imported module"` to Sentry's `ignoreErrors` list since the auto-reload handles recovery — no need to alert on it.

- **File**: `src/lib/sentry.ts` — add two strings to `ignoreErrors`

### Implementation detail

```typescript
// src/lib/chunkErrorHandler.ts
const KEY = 'chunk-reload';

function handleChunkError() {
  const alreadyReloaded = sessionStorage.getItem(KEY);
  if (!alreadyReloaded) {
    sessionStorage.setItem(KEY, '1');
    window.location.reload();
  } else {
    sessionStorage.removeItem(KEY);
  }
}

// Catch static module script failures
window.addEventListener('error', (e) => {
  if (e.message?.includes('module script')) handleChunkError();
}, true);

// Catch dynamic import() failures  
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || '';
  if (msg.includes('dynamically imported module') || msg.includes('module script')) {
    e.preventDefault();
    handleChunkError();
  }
});

// Clear flag on successful load
sessionStorage.removeItem(KEY);
```

Import this file at the top of `src/main.tsx` so it runs before any module resolution.

**Files changed**: 3 (new `chunkErrorHandler.ts`, edit `main.tsx`, edit `sentry.ts`)

