

## Fix: Product Images Being Cropped

### Problem
Product images use `object-cover`, which fills the container by cropping parts of the image. This cuts off important product details — especially when the image aspect ratio doesn't match the card's container ratio.

### Solution
Switch from `object-cover` to `object-contain` on mobile, so the full image is always visible. On desktop (multi-column grid), keep `object-cover` for a cleaner, uniform grid appearance since the images are smaller there.

Additionally, add a subtle background so the letterboxing around non-square images looks clean rather than leaving empty white/dark space.

### Files to change

| File | Change |
|------|--------|
| `src/components/ui/ProductCard.tsx` (line 161) | Change `object-cover` → `object-contain sm:object-cover` on the `<img>` tag |
| `src/components/ui/ProductCard.tsx` (line 145) | Same change on the `<BackgroundVideo>` tag |
| `src/components/ui/ProductCard.tsx` (line 138) | Change `bg-muted/40` → `bg-muted` for a cleaner letterbox background on mobile |

This ensures the full product image is visible on mobile (single-column, large cards) while maintaining the clean grid aesthetic on desktop.

