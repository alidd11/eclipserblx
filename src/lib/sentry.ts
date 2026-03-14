// Lazy-load Sentry to avoid blocking initial render
// Only essential integrations are imported — Replay, Feedback, Profiling are excluded
// and tree-shaken via define flags in vite.config.ts (~60 KiB savings)

let captureFn: ((error: Error, extra?: Record<string, unknown>) => void) | null = null;
const errorQueue: Array<{ error: Error; extra?: Record<string, unknown> }> = [];
let loading = false;

async function loadSentry() {
  if (loading) return;
  loading = true;

  const Sentry = await import("@sentry/react");

  Sentry.init({
    dsn: "https://4ac222b43cbc5852505f1a84b54fff28@o4510982044581888.ingest.de.sentry.io/4510982079905872",
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    enabled: import.meta.env.PROD,
    environment: import.meta.env.MODE,

    // Only keep essential integrations — Replay/Feedback/Profiling are tree-shaken
    // via __RRWEB_EXCLUDE_* and __SENTRY_EXCLUDE_* define flags
    integrations(defaults) {
      return defaults.filter(
        (i) =>
          !["Replay", "Feedback", "BrowserProfiling"].includes(i.name)
      );
    },

    ignoreErrors: [
      "ResizeObserver loop",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "Load failed",
      "Failed to fetch",
      "NetworkError",
      "AbortError",
      "Importing a module script failed",
      "Failed to fetch dynamically imported module",
      "View transition was skipped",
    ],
    beforeSend(event) {
      if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
        frame => frame.filename?.includes("extension://")
      )) {
        return null;
      }
      return event;
    },
  });

  captureFn = (error, extra) => Sentry.captureException(error, { extra });

  // Flush queued errors
  for (const { error, extra } of errorQueue) {
    captureFn(error, extra);
  }
  errorQueue.length = 0;
}

/**
 * Capture an exception — queues it if Sentry hasn't loaded yet.
 */
export function captureException(error: Error, extra?: Record<string, unknown>) {
  if (captureFn) {
    captureFn(error, extra);
  } else {
    errorQueue.push({ error, extra });
  }
}

// Load Sentry after critical resources using requestIdleCallback
if (import.meta.env.PROD) {
  const schedule = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 2000);
  schedule(() => loadSentry());
} else {
  loadSentry();
}
