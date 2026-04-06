

# Permanent Fix: PWA Header Clipping on All Pages

## Problem
Pages with `sticky top-0` headers inside containers that use `safe-area-page` (which adds `padding-top: env(safe-area-inset-top)`) work correctly — the sticky header sits below the safe-area padding. However, two patterns still cause the header to hide behind the device notch/status bar:

1. **Immersive admin pages** — `AdminLayout` returns `null` for the header when `isImmersivePage` is true, leaving the page's own header without safe-area coverage. Currently only Twitter Posts is flagged, and it was patched individually. Any future immersive page would have the same bug.

2. **SellerSetup** — Uses `safe-area-page` on the root container with a `sticky top-0` header inside. The sticky header sticks to `top: 0`, which is *inside* the safe-area padding, so this actually works. ✅

3. **GlobalGuardLayout mobile header** — Root has `paddingTop: env(safe-area-inset-top)` and header is `sticky top-0` inside, which sticks correctly. ✅

**The only systemic risk is the `isImmersivePage` pattern in AdminLayout** — when the standard header is nulled out, the child page must handle its own safe-area padding, which is fragile.

## Fix: Make `isImmersivePage` safe by default

Instead of returning `null` for the header on immersive pages (forcing each page to self-patch), inject a minimal transparent safe-area spacer so the content area always starts below the notch.

### Changes

**File: `src/components/admin/AdminLayout.tsx`**

Replace the immersive branch of `customHeader`:
```typescript
// Before
isImmersivePage ? null : ( ... )

// After  
isImmersivePage ? (
  // Minimal safe-area spacer — immersive pages handle their own header
  // but the notch area must still be reserved
  <div 
    className="w-full bg-transparent" 
    style={{ height: 'env(safe-area-inset-top, 0px)' }} 
  />
) : ( ... )
```

Then **remove** the manual `paddingTop` patch from `src/pages/admin/TwitterPosts.tsx` since the layout now handles it globally.

**File: `src/pages/admin/TwitterPosts.tsx`**

Remove the inline `style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}` from the sticky header div — no longer needed.

### Why this is permanent
- Any page added to the `isImmersivePage` list in the future automatically gets safe-area protection without needing a per-page patch.
- Zero risk to existing pages — non-immersive pages are untouched, and the spacer is transparent with zero height on non-notched devices.

### Verification steps
1. TypeScript compilation check (`npx tsc --noEmit`)
2. Confirm Twitter Posts header renders below the notch
3. Confirm all other admin pages are unaffected

