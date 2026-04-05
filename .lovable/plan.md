

## Remove Theme Switching — Lock to Dark Mode

Since the app is designed around a dark aesthetic and the theme toggle keeps causing issues, we'll remove theme switching entirely and hard-lock to dark mode.

### Changes

1. **`src/main.tsx`** — Remove `next-themes` `ThemeProvider` wrapper entirely. Just add `class="dark"` to the HTML root via a simple effect or keep it static.

2. **`src/pages/Account.tsx`** — Remove the Theme `ExpandableSection` block (lines ~641-644) and the `ThemeSettingsCard` import.

3. **`src/components/account/ThemeSettingsCard.tsx`** — Delete the file.

4. **`src/index.css`** — Remove the `:root` (light mode) CSS variables block entirely, keeping only the `.dark` block. This prevents any accidental light-mode rendering.

5. **`src/components/layout/GlobalBackground.tsx`** — Remove the `dark:opacity-100 opacity-0` conditional on the vignette div (just use `opacity-100` since we're always dark).

6. **`src/components/landing/HeroBanner.tsx`** — No change needed (already dark-optimized).

This eliminates the `next-themes` dependency from rendering logic and ensures the app is always dark.

