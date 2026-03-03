import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://4ac222b43cbc5852505f1a84b54fff28@o4510982044581888.ingest.de.sentry.io/4510982079905872",
  
  // Performance monitoring — sample 20% of transactions in production
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

  // Only send events in production
  enabled: import.meta.env.PROD,

  // Environment tag
  environment: import.meta.env.MODE,

  // Filter out noisy errors
  ignoreErrors: [
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    "Load failed",
    "Failed to fetch",
    "NetworkError",
    "AbortError",
  ],

  beforeSend(event) {
    // Don't send events from browser extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
      frame => frame.filename?.includes("extension://")
    )) {
      return null;
    }
    return event;
  },
});

export { Sentry };
