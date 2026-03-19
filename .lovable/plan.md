
Do I know what the issue is? Yes.

I traced this to a startup-resilience problem, not a backend/data issue:
1) first-launch chunk/module failures in PWA mode are not being recovered consistently,
2) the global app boundary can be tripped by non-critical lazy widgets,
3) retry logic currently blocks recovery when `__chunk` is already in the URL,
4) there are still Safari-unstable ref/lazy patterns in startup UI paths (plus many ref warnings).

## What I found in code
- `src/components/ConnectionErrorBoundary.tsx`
  - Missing Safari `"load failed"` chunk pattern.
  - User retry still exits early if URL already has `__chunk`.
- `src/lib/chunkErrorHandler.ts`
  - Dynamic-import rejection path doesn’t robustly treat Safari first-open failure cases.
- `src/App.tsx`
  - One shared `Suspense` block loads multiple non-critical lazy widgets globally; if any one fails, full app can fall into global error boundary.
- Startup warning noise confirms ref/lazy instability in launch path (`PromotionCarousel`, landing stack, chat/cookie/sidebar dialog stacks), matching the PWA first-open symptoms.

## Implementation plan
1) Create one shared hard-recovery utility
- Add a single recovery helper used by:
  - `chunkErrorHandler`
  - `ConnectionErrorBoundary`
  - `RouteErrorBoundary`
- Behavior:
  - clear runtime caches,
  - always allow user-initiated retry to force a fresh cache-busted reload (even if `__chunk` is already present),
  - enforce anti-loop guard with timestamp + attempt key.

2) Fix top-level boundary detection/retry
- Update `ConnectionErrorBoundary` to include Safari chunk signatures (including `"load failed"`).
- Remove the current “already has `__chunk` => return” dead-end for user retries.
- Add structured diagnostics (`name`, `message`, `pathname`, `search`) before recovery so future failures are traceable.

3) Align route-level recovery
- Apply same retry/`__chunk` behavior to `RouteErrorBoundary`.
- Keep cooldown for auto-recovery, but let manual retry always force a fresh recovery attempt.

4) Harden global startup so non-critical lazy failures never crash the app
- In `App.tsx`, split the non-critical lazy widgets into isolated boundaries/fail-open wrappers (`fallback: null` + local error swallow).
- Ensure chat/banner/consent/tooling widgets cannot bring down customer/admin shell on boot.

5) Remove/refactor Safari-sensitive launch-path ref usage
- Keep critical entry components as plain function components in PWA launch flow.
- Replace any ref-requiring animation usage by wrapping with native DOM elements (instead of forcing `forwardRef` on launch-critical components).
- Specifically revisit launch-path components currently causing warnings in landing/global startup.

6) Validation pass (customer + admin PWA)
- Test matrix:
  - customer PWA: first open x5, after background resume x5, before/after login
  - admin PWA: first open x5, after background resume x5, before/after login
  - viewports: 390x844, 414x896, 768x1024
- Confirm:
  - no full-screen “Something Went Wrong” on first open,
  - no multi-try requirement,
  - no chunk recovery loop,
  - no functional regressions in navigation/auth/dashboard.

## Severity and expected outcomes
- Critical: first-open PWA failure loop (customer/admin) — fixed by steps 1–4.
- High: retry dead-end when `__chunk` already present — fixed by steps 1–3.
- Medium: startup ref/lazy instability warnings with Safari risk — reduced by step 5.
- Low: residual console warning cleanup — tracked after stability is confirmed.

After implementing, I’ll provide a final post-fix report with:
- fixed vs remaining items,
- reproducibility status,
- residual risks/scalability notes.
