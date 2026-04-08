// Chunk error recovery must run before any module resolution
import "./lib/chunkErrorHandler";
// Sentry loads lazily via requestIdleCallback — self-initializing module
import "./lib/sentry";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Lock to dark mode permanently
document.documentElement.classList.add("dark");

// ── Enterprise PWA: schedule non-critical work after first paint ──
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// After first interactive paint, hint the browser to prioritise compositing
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Pre-warm the image cache worker and cleanup stale SW caches
    if ('caches' in window) {
      caches.keys().then(names => {
        const stale = names.filter(n => n.startsWith('workbox-precache') && !n.endsWith('-v6'));
        stale.forEach(n => caches.delete(n));
      });
    }
  }, { timeout: 5000 });
}
