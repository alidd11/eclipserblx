

## Improve Product Cards to Enterprise Level

### What Changes

Taking inspiration from ClearlyDev, Amazon, and eBay card patterns, these refinements polish the existing `ProductCard` without a full rewrite:

**1. Image area — taller aspect ratio + image dots**
- Change from `aspect-[4/3]` to `aspect-square` for more visual impact (matches ClearlyDev)
- Add small dot indicators when multiple images exist (visible on hover), so users know there's more to see
- Use `object-contain` with a subtle dark background instead of `object-cover` to show products without cropping

**2. Store strip — merge into content area**
- Remove the separate `h-7` store strip bar. Instead, place the store name + verified badge inline below the product title (like Amazon's "by StoreName" pattern)
- This saves vertical space and feels cleaner

**3. Rating stars — always visible when available**
- Move star rating from the store strip to sit next to the price, like ClearlyDev and Amazon
- Show rating count if available (e.g. "4.8 (12)")

**4. Price row — bolder, left-aligned with quick-add**
- Make price larger and bolder (`text-sm font-bold` on mobile, `text-base` on desktop)
- Add a compact cart icon button on the right side of the price row (like ClearlyDev's cart icon). Currently there is no add-to-cart on the card itself — this is a major conversion improvement
- Member discount pricing stays as-is but with slightly larger text

**5. Category badge — move below image**
- Instead of overlaying on the image, show category as a small muted text label above the product name (like ClearlyDev's tag pill). Keeps the image clean
- Sale/Featured/New badges stay as image overlays since they're attention-grabbers

**6. Hover state — more polished**
- Replace the dark gradient overlay with a subtle border highlight + slight lift (`shadow-md`)
- Image zoom stays at 1.05 scale

**7. Border & rounding**
- Tighten border radius from `rounded-lg` to `rounded-xl` for a more modern feel
- Remove the faint border default, add it only on hover for a cleaner grid appearance

### Files Changed
- `src/components/ui/ProductCard.tsx` — All visual changes above
- `src/components/ui/ProductCardSkeleton.tsx` — Match new layout proportions

### Technical Notes
- No new dependencies or database changes
- All existing props preserved — purely visual refactor
- The quick-add cart button uses `e.preventDefault()` + `e.stopPropagation()` to avoid navigating on click (same pattern already in handleAddToCart)

