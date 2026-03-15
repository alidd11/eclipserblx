
Goal: fix the Safari resume loop where the app gets stuck on `RouteErrorBoundary` after backgrounding and won’t recover with Retry/Home.

Plan:
1. Identify and fix the “sticky boundary” behavior  
- Update `src/components/AppRoutes.tsx` to pass route state (`pathname + search + location.key`) into the route boundary so it can reset on navigation/resume.  
- Update `src/components/RouteErrorBoundary.tsx` to auto-reset when the route key changes (instead of persisting `hasError` forever across tab taps).

2. Add robust recovery for Safari chunk/import failures  
- Harden `src/lib/chunkErrorHandler.ts` to detect Safari-specific import errors (`Load failed`) in addition to existing module/chunk patterns.  
- In `RouteErrorBoundary`, if caught error matches chunk/import/load-failure signatures, trigger a one-time hard recovery (cache-busted reload) instead of showing a dead-end fallback.

3. Add resume-time recovery hook for iOS/Safari  
- In `AppRoutes` (or a small helper used there), listen for `pageshow` (especially `event.persisted`) and visibility return, then remount/reset the route boundary once to recover from BFCache/background corruption states.

4. Improve fallback actions so user is never trapped  
- Keep Retry/Home, but make Retry perform a true route remount and Home do a hard navigation recovery path if the same error repeats.

Technical details:
- Files to modify:
  - `src/components/RouteErrorBoundary.tsx`
  - `src/components/AppRoutes.tsx`
  - `src/lib/chunkErrorHandler.ts`
- Error signatures to handle:
  - `Load failed`
  - `Failed to fetch dynamically imported module`
  - `Importing a module script failed`
  - `ChunkLoadError`
- Recovery guard:
  - one-time cooldown flag in safe storage/session storage to prevent reload loops.

Validation after implementation:
- Reproduce on mobile Safari: open `/products` (Shop), background app, return after 10–60s.
- Confirm: no permanent error screen; Retry/Home recover; tab switches recover.
- Confirm normal behavior still works on Chrome + desktop Safari.
