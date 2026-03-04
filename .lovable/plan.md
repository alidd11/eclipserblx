

## Reduce Sentry bundle by ~50% (144 KiB → ~75 KiB)

The Lighthouse treemap shows Sentry's chunk includes heavy default integrations that aren't configured or used: **Session Replay (40 KiB)**, **Feedback (15.5 KiB)**, **Profiling (5.4 KiB)**, and **Browser Metrics (6.8 KiB)**. These get auto-bundled by `@sentry/react` v10's default export.

### What changes

**`src/lib/sentry.ts`** — Explicitly configure only the integrations you need and disable the heavy defaults:

- Import from `@sentry/react` with explicit integration selection
- Add `replaysSessionSampleRate: 0` and `replaysOnErrorSampleRate: 0` to prevent replay from loading
- Set `integrations` to exclude `Replay`, `Feedback`, `BrowserProfiling` 
- Keep only: `BrowserTracing` (for the 0.2 sample rate you already use), `GlobalHandlers`, `Dedupe`

### Expected impact

- Sentry chunk drops from ~144 KiB to ~75 KiB (saves ~69 KiB)
- Total JS drops from 528 KiB to ~459 KiB  
- Mobile score should improve 3-5 points from reduced parse/compile time
- No functionality change — you weren't using replay, feedback, or profiling

### Risk

Very low. This only removes integrations that were never configured. Error capture, breadcrumbs, and trace sampling remain identical.

