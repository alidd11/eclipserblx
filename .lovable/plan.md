

## Plan: Ensure Product Images Are Visible on All Devices

### Problem
Product card images currently use `aspect-square` (1:1 ratio), which works but can feel small on mobile (2-col grid) and may not showcase product details well enough. The grid is capped at 4 columns on desktop, which is good, but image rendering can be improved for clarity and visual impact across breakpoints.

### Changes

**1. Improve image aspect ratio on mobile for more visual space**
- Change the image container from a strict `aspect-square` to a slightly taller ratio on mobile (`aspect-[4/5]`) so product images get more vertical space on smaller screens, reverting to `aspect-square` on `sm` and up.
- File: `src/components/ui/ProductCard.tsx` — line 138

**2. Ensure high-resolution images are requested**
- The `optimizeImageUrl` function currently doesn't resize images at all — it just proxies them. This means full-size images are being loaded even for small cards. No change needed here since the concern is visibility, not performance, but worth noting.

**3. Update ProductCardSkeleton to match new aspect ratio**
- File: `src/components/ui/ProductCardSkeleton.tsx` — update skeleton from `aspect-square` to `aspect-[4/5] sm:aspect-square` to match.

**4. Ensure FreeAssetsTeaser uses consistent card sizing**
- The Free Assets section uses its own mini-cards with `aspect-square` and `min-w-[120px]`. These are too small on mobile. Switch to using the standard `ProductCard` component or at least increase the minimum size.
- File: `src/components/landing/FreeAssetsTeaser.tsx`

**5. Ensure StoreProductGrid matches the 4-col cap**
- File: `src/components/store/StoreProductGrid.tsx` — verify grid classes are `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` (no 5th column).

### Summary of file changes
| File | Change |
|------|--------|
| `ProductCard.tsx` | `aspect-square` → `aspect-[4/5] sm:aspect-square` on image container |
| `ProductCardSkeleton.tsx` | Match updated aspect ratio |
| `FreeAssetsTeaser.tsx` | Increase minimum card size from 120px to 160px, use taller aspect ratio |
| `StoreProductGrid.tsx` | Confirm/enforce 4-col cap |
| `FeaturedProducts.tsx` | Already single-card carousel — no changes needed |

