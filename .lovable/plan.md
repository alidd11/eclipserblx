

## Fix: Remove Grey Letterboxing on Mobile Product Cards

### Problem
With `object-contain` on a fixed `aspect-[5/4]` container, images that don't match the ratio show grey (`bg-muted`) bars above and below. The image fits inside the box but doesn't fill it.

### Solution
On mobile, remove the fixed aspect ratio and let the image dictate its own height naturally. Keep the fixed `aspect-square` for `sm` and above where `object-cover` is used.

### File: `src/components/ui/ProductCard.tsx`

**Line 138** — Change:
```
aspect-[5/4] sm:aspect-square bg-muted
```
to:
```
sm:aspect-square bg-muted
```

**Line 145 & 161** — Change `object-contain sm:object-cover` to just `object-cover` since without a fixed aspect ratio on mobile the image will show at its natural proportions (no cropping), and on `sm+` the square container + cover keeps the grid uniform.

Alternatively, keep `object-contain` on mobile but pair it with `aspect-auto` so the container collapses to the image's natural size — no grey bars.

Simplest approach: **Line 138** change to `aspect-auto sm:aspect-square bg-muted` and revert lines 145/161 back to `object-cover` everywhere. On mobile, `aspect-auto` lets the container match the image's natural ratio, so `object-cover` won't crop. On `sm+`, the square aspect forces uniform cards.

| Line | From | To |
|------|------|----|
| 138 | `aspect-[5/4] sm:aspect-square bg-muted` | `aspect-auto sm:aspect-square bg-muted` |
| 145 | `object-contain sm:object-cover` | `object-cover` |
| 161 | `object-contain sm:object-cover` | `object-cover` |

Also update `ProductCardSkeleton.tsx` to match: skeleton image container uses `aspect-auto sm:aspect-square`.

