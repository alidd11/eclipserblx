

## Make PWA Title Bar Enterprise-Level

The screenshot shows the iOS PWA status bar / title area. The issue is that the `theme_color` (`#151617`) doesn't perfectly match the app's actual background (`hsl(220, 8%, 6%)` ≈ `#0e0f11`), creating a subtle but noticeable disconnect. To make this feel seamless and enterprise-grade:

### Changes

1. **`public/manifest.webmanifest`** — Update `theme_color` and `background_color` from `#151617` to `#0e0f11` to match the app's dark background exactly. This makes the status bar blend seamlessly into the app.

2. **`index.html`** — Update the `<meta name="theme-color">` tag from `#151617` to `#0e0f11` for the same reason.

3. **`public/manifest-admin.json`** — Same update for consistency across all manifests (`#151617` → `#0e0f11`).

4. **`public/offline.html`** — Update `theme-color` meta from `#0a0a0f` to `#0e0f11` so the offline page matches too.

### Result
The iOS status bar, splash screen, and title bar will blend perfectly with the app background — no visible seam, fully cohesive. Users will need to re-add the PWA to home screen for the change to take effect.

