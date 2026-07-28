// Lazy-load Sentry to avoid blocking initial render
// Only essential integrations are imported — Replay, Feedback, Profiling are excluded
// and tree-shaken via define flags in vite.config.ts (~60 KiB savings)

let captureFn: ((error: Error, extra?: Record<string, unknown>) => void) | null = null;
const errorQueue: Array<{ error: Error; extra?: Record<string, unknown> }> = [];
let loading = false;
let removeBootstrapListeners: (() => void) | null = null;

async function loadSentry() {
  if (loading) return;
  loading = true;

  try {
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
      "Rejected",  // SW registration rejection on older Android/iOS
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
    removeBootstrapListeners?.();
    removeBootstrapListeners = null;

    // Flush queued errors
    for (const { error, extra } of errorQueue) {
      captureFn(error, extra);
    }
    errorQueue.length = 0;
  } catch {
    // A monitoring outage must never affect the application.
    loading = false;
  }
}

/**
 * Capture an exception — queues it if Sentry hasn't loaded yet.
 */
export function captureException(error: Error, extra?: Record<string, unknown>) {
  if (captureFn) {
    captureFn(error, extra);
  } else {
    errorQueue.push({ error, extra });
    void loadSentry();
  }
}

// Keep the monitoring vendor off the error-free critical path. Lightweight
// bootstrap listeners load it on the first actual runtime failure, retaining
// early error coverage without downloading the SDK during a healthy visit.
if (import.meta.env.PROD) {
  const onError = (event: ErrorEvent) => {
    captureException(
      event.error instanceof Error ? event.error : new Error(event.message || 'Unhandled window error'),
      { source: 'window.error.bootstrap' },
    );
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    captureException(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { source: 'window.unhandledrejection.bootstrap' },
    );
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  removeBootstrapListeners = () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
} else {
  void loadSentry();
}
