import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initNativeOrientation } from "./lib/nativeOrientation";

// Initialize native orientation lock (portrait only on native apps)
initNativeOrientation();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);
