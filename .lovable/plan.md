

# Mobile Preview Toggle for Store Builder

Add a device toggle (Desktop / Mobile) to the preview panel header so sellers can simulate how their storefront looks on different screen sizes without leaving the builder.

## Approach

**SellerStoreBuilder.tsx**:
- Add `previewMode` state (`'desktop' | 'mobile'`)
- Pass it to `BuilderPreview`
- Render toggle buttons (Monitor / Smartphone icons) in the preview panel header next to "Live Preview"

**BuilderPreview.tsx**:
- Accept `previewMode` prop
- When `mobile`, constrain the preview wrapper to `max-w-[375px] mx-auto` and adjust the browser chrome to show a phone-style frame
- When `desktop`, keep the current full-width layout
- Adjust product grids to use 2 columns in mobile mode vs 4 in desktop

## Files to Change

| File | Change |
|------|--------|
| `src/pages/seller/SellerStoreBuilder.tsx` | Add `previewMode` state + toggle buttons in preview header |
| `src/components/seller/builder/BuilderPreview.tsx` | Accept `previewMode` prop, apply width constraints and grid adjustments |

