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

createRoot(document.getElementById("root")!).render(<App />);
