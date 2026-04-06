

# Performance & Speed Optimization — Enterprise Audit Fix

## Findings Summary

Based on browser performance profiling and code audit:

- **FCP: 1180ms** — good but improvable
- **Full Page Load: 3301ms** — needs reduction  
- **CLS: 0.0006** — excellent
- **155 resources loaded**, 1456KB total JS
- **CSS: 1108 lines**, ~500 lines of dead theme code shipping to every user

## Critical Issues Found

### 1. Font Declaration Mismatch (HIGH IMPACT)
The CSS body uses `font-family: 'Manrope'` and headings use `font-family: 'Space Grotesk'` — but neither font is self-hosted or loaded anywhere. The actual fonts are `Sora` (display) and `Source Sans 3` (body), which are preloaded in `index.html` and configured in `tailwind.config.ts`. This means the browser tries to find Manrope/Space Grotesk, fails, falls back to system fonts, and the preloaded Sora/Source Sans 3 fonts go unused in CSS — wasting bandwidth and causing a font mismatch.

**Fix**: Change `index.css` body font to `'Source Sans 3'` and heading font to `'Sora'` to match the actual self-hosted fonts.

### 2. ~500 Lines of Unused Theme CSS (HIGH IMPACT)
Theme variants (Ocean, Ember, Forest, Mono — lines 136-610) ship ~500 lines of CSS custom properties to every user. These are only used when a user explicitly selects a theme via `useThemeColor`. This is dead weight for 99% of page loads.

**Fix**: Extract theme variant CSS into a separate file (`src/styles/themes.css`) and lazy-load it only when a non-default theme is active, using a dynamic `<link>` tag. For the initial load, only the default dark theme ships.

### 3. Destructive `all: unset` Hover Guard (MEDIUM IMPACT)
Lines 1080-1103 use `all: unset` inside `@media (hover: none)` to disable hover effects on touch devices. `all: unset` resets ALL properties including layout, display, position, and box model — breaking button sizes, link styling, and card layouts on mobile. This is likely the root cause of past mobile visual bugs.

**Fix**: Replace `all: unset` with targeted property resets that only undo visual hover effects: `background-color: inherit; color: inherit; opacity: inherit; text-decoration: inherit; box-shadow: inherit; border-color: inherit; transform: none;`

### 4. Unnecessary Paint Layers (LOW-MEDIUM IMPACT)
- `body::before` creates a fixed pseudo-element just to set a background color that's already set on `body` itself — wastes a compositor layer
- `transition: background-color 0.3s` on `html` and `body` forces the browser to check for transitions every frame — unnecessary for a dark-only app

**Fix**: Remove `body::before` entirely. Remove `transition` on html/body since the app is dark-only.

### 5. Duplicate/Redundant CSS Declarations (LOW IMPACT)
- `padding-bottom: 0` declared twice on `body`
- `overscroll-behavior` set on html, body, and in PWA media query redundantly
- `min-height` set 4 times with different units on body (100vh, 100svh, 100dvh, -webkit-fill-available)

**Fix**: Deduplicate — keep only `100dvh` with `-webkit-fill-available` fallback.

### 6. `inline critical CSS` in index.html Drift
The inline `<style>` in `index.html` (line 46) sets `--primary: 235 86% 60%` but `index.css` sets `--primary: 235 86% 65%` — a 5% lightness mismatch causing a flash of wrong-color primary on initial load.

**Fix**: Sync the inline critical CSS primary value to match `index.css`.

## Files Modified

1. **`src/index.css`** — Fix font families, remove body::before, remove transitions, deduplicate declarations, fix hover guard, extract themes to lazy-loaded file
2. **`src/styles/themes.css`** (NEW) — Contains Ocean/Ember/Forest/Mono theme CSS, loaded on demand
3. **`src/hooks/useThemeColor.ts`** — Add dynamic CSS import when non-default theme is selected
4. **`index.html`** — Fix inline critical CSS primary color value

## Impact

- **~500 lines removed from critical CSS path** (themes moved to lazy file)
- **Font rendering fixed** — preloaded fonts actually used instead of falling back
- **Mobile layout stability** — no more `all: unset` destroying layouts
- **~1 fewer compositor layer** — body::before removed
- **Estimated FCP improvement**: 100-200ms from reduced CSS parse + correct font loading

