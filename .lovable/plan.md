
Summary of what I found
- The main breakage is from a global CSS optimization in `src/index.css`:
  - `img:not([data-no-fade]) { opacity: 0; ... }`
  - It expects `.loaded` / `data-loaded="true"` or `[complete]` to reveal images.
  - There is no code in the app that adds `.loaded`/`data-loaded`, and `[complete]` is not a reliable HTML attribute selector for image load state.
  - Result: many `<img>` elements stay invisible (black/empty media panels), even when network requests return 200.
- Runtime confirms this is not primarily a storage/network outage:
  - Product image requests return 200 with valid `content-type` and non-zero `content-length`.
  - Product cards and product detail still render blank media panels.
- Duplicate-data check:
  - No systemic duplicate product-media records causing this symptom.
  - One product (`Roblox Game Landing Page`) stores encoded `%2F` paths in URLs, but those files do exist and are retrievable.

Implementation plan
1) Remove the broken global image fade rule (root fix)
- File: `src/index.css` (image fade block near the end).
- Replace current global rule with an opt-in fade pattern (or temporarily disable fade entirely):
  - Do not set opacity 0 on all `img`.
  - Only fade images that explicitly opt in (e.g., `img[data-fade-in="true"]`).
- This immediately restores visibility across product cards, product detail gallery, and every other plain `<img>` in the app.

2) Keep fade behavior only where it is actually managed
- Use existing controlled component (`OptimizedImage`) for blur/fade transitions where needed.
- For plain `<img>` in key commerce surfaces (`ProductCard`, `ProductDetail`, featured/landing grids), keep direct rendering without global opacity hacks.

3) Harden product detail media fallback (currently weaker than ProductCard)
- File: `src/pages/ProductDetail.tsx`.
- Add `onError` and `onLoad` natural-size guard to main gallery image (same resilience already used in `ProductCard`).
- If current image fails, advance to next media; if all fail, show letter/placeholder state.
- This prevents “stuck blank panel” even if a specific media file is corrupted.

4) Normalize media URL de-duplication/canonicalization
- File: `src/lib/mediaUtils.ts`.
- Canonicalize URLs before de-duping (`trim`, normalize encoded path segments where safe) so `%2F` and `/` variants don’t behave as separate entries.
- Keep images-first/video-fallback chain behavior.

5) Clean minor duplicates/noise while touching media code
- Remove unused/duplicate imports that can confuse debugging (e.g., stale unused constants/imports in card components).
- Keep behavior unchanged; this is hygiene to reduce future regressions.

Verification plan (must pass before closing)
- `/products` on mobile viewport (440x782): first 2 rows all show visible media (not black panels).
- `/products/:id` (e.g., product 17): main gallery image visible; thumbnails visible; next/prev media works.
- Products with video/GIF-first media:
  - Card shows image/GIF fallback correctly.
  - Detail page handles video entries and image entries without blank states.
- Confirm no new console errors related to image handling.
- Spot-check at least one product from each: static image, GIF, video-first, and multi-image listings.

Technical details (why this fixes it)
- The optimization attempted a global fade-in using CSS-only state detection, but image load state here is JS/property-driven, not reliably exposed via `[complete]` selector.
- By removing global `opacity:0` from all images and switching to opt-in fade, we avoid invisible media across the app.
- Network/storage checks already show images are being served; rendering logic is what hid them.
