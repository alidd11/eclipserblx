

## Fix: Mobile Product Card Image Sizing

### Problem
With the single-column mobile layout, the `aspect-[4/5]` ratio on full-width cards makes images absurdly tall — each card consumes nearly the entire screen, requiring excessive scrolling.

### Solution
Switch the mobile aspect ratio to a landscape-friendly `aspect-[5/4]` (wider than tall) for single-column view, transitioning to `aspect-square` at `sm` and above where cards are in a multi-column grid. This keeps images prominent but compact, showing ~2 cards per screen on mobile.

### Files to change

| File | Change |
|------|--------|
| `src/components/ui/ProductCard.tsx` (line 138) | `aspect-[4/5] sm:aspect-square` → `aspect-[5/4] sm:aspect-square` |
| `src/components/ui/ProductCardSkeleton.tsx` | Match the same ratio update |

This gives a cinematic, wide image on mobile that showcases the product without dominating the viewport.

