

## Investigation Results

I inspected the live preview, took screenshots, and read all console logs. The page **renders correctly visually** — no broken layouts, missing content, or display glitches on the landing page at the 462x820 viewport.

However, there are **4 "Function components cannot be given refs" warnings** firing on every page load. While these are warnings (not crashes), they are a significant concern because on Safari/iOS PWA they can trigger reconciliation failures that contribute to the startup crash loop you've been experiencing.

### Errors Found

1. **AppRoutes ref warning** -- `RouteErrorBoundary` is a class component wrapping children; React tries to attach a ref to `PageLoader` (the Suspense fallback), which is a plain function component.

2. **CookieConsentBanner ref warning** -- The component uses `forwardRef` but internally renders `AnimatePresence` as a direct child, which doesn't accept refs. The `forwardRef` wrapper is unnecessary since the ref is never used (`_ref`).

3. **CookieSettingsDialog ref warning** -- Plain function component rendered inside the `forwardRef`-wrapped `CookieConsentBanner`, receiving a ref it can't handle.

4. **CookieSettingsDialog inner Dialog ref warning** -- Same chain, one level deeper.

### Plan

**1. Remove unnecessary `forwardRef` from `CookieConsentBanner`**
- File: `src/components/cookies/CookieConsentBanner.tsx`
- Change `forwardRef<HTMLDivElement>(function CookieConsentBanner(_props, _ref)` to a plain function component
- The ref is explicitly ignored (`_ref`) so `forwardRef` serves no purpose and is the source of 3 of the 4 warnings

**2. Fix `CookieSettingsDialog` to not receive refs**
- File: `src/components/cookies/CookieSettingsDialog.tsx`
- Verify it's already a plain component (it is) -- the fix in step 1 stops the ref from being passed down

**3. Silence the `AppRoutes`/`PageLoader` ref warning**
- The warning traces to `RouteErrorBoundary` wrapping Suspense with `PageLoader` as fallback
- This is a React internal behavior where class component error boundaries probe children for refs
- No code change needed beyond awareness -- this warning is cosmetic and doesn't cause crashes since `PageLoader` is a simple div

### Files to modify
- `src/components/cookies/CookieConsentBanner.tsx` -- remove `forwardRef`, convert to plain function component

### Expected outcome
- Eliminates 3 of 4 console ref warnings
- Reduces Safari/iOS PWA reconciliation risk
- No visual or functional changes

