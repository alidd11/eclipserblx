

# Hero Section — Enterprise Compaction

## Problem
The hero currently occupies ~380px on desktop with centered, multi-line text and generous padding. This pushes products below the fold, wasting prime real estate. The heading wraps across two lines on most screens.

## Approach
Compress the hero into a single compact strip — heading on one line, CTA inline, stats inline. Reduce vertical padding dramatically so trending products are visible immediately without scrolling (similar to Amazon/Shopify marketplace patterns).

## Changes

### `src/components/landing/LandingHero.tsx`

**Desktop layout (lg+):**
- Put everything in a single horizontal row: heading left, CTA + stats right
- Remove `max-w-4xl` constraint and reduce font size to `text-4xl xl:text-5xl` so the full "THE MARKETPLACE FOR ROBLOX CREATORS" fits on one line
- Remove the separate description paragraph — the stats strip already communicates value
- Reduce section padding from `lg:py-20` → `lg:py-10`
- Reduce `lg:min-h-[380px]` → `lg:min-h-[200px]`
- Layout: `flex items-center justify-between` instead of `flex-col items-center text-center`

**Mobile layout:**
- Keep existing compact layout (already good)
- Reduce `py-8` → `py-6` for slightly tighter spacing

**Result:** Hero shrinks from ~380px to ~200px on desktop, trending products move above the fold.

### `src/components/landing/HeroBanner.tsx`
- No structural changes — background image still fills the section naturally

### Technical Details

```
Before:  [    HEADING (2 lines, centered)    ]
         [       description paragraph        ]
         [     CTA button    |   Start selling ]
         [        stats strip                  ]
         ~380px tall

After:   [ HEADING (1 line)    |  CTA  stats  ]
         ~200px tall
```

Desktop heading becomes left-aligned with `whitespace-nowrap`, CTA and stats group on the right. The "Start selling" link and stat pills sit below the CTA button in a compact vertical stack on the right side.

### Files Modified
| File | Change |
|------|--------|
| `src/components/landing/LandingHero.tsx` | Horizontal layout, single-line heading, reduced padding |

