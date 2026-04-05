
## Enterprise Featured Page Overhaul

### Problems with Current Page
1. **Hero product has no image** — the placeholder icon looks broken/empty
2. **Oversized hero section** — too much whitespace, the "Staff Picks" badge + heading + subtext take up almost half the viewport before any product appears
3. **Section headers** are heavy with icon boxes — enterprise sites use clean, minimal headers
4. **No editorial curation feel** — looks like a generic product grid page, not a curated editorial experience
5. **CTA bottom section** is generic filler

### Enterprise Redesign

**1. Compact Hero — Editorial Magazine Style**
- Remove the oversized centered heading. Replace with a compact left-aligned section header ("Staff Picks") with a subtle editorial tagline
- The hero product card becomes a wide editorial banner (full-width, aspect-[2.5/1]) with the product image bleeding edge-to-edge and text overlaid — like Apple's featured app banners

**2. Flattened Section Headers**
- Replace the icon-box + heading pattern with clean uppercase tracking-wide labels and a muted subheading — matching the existing enterprise aesthetic (see memory: marketplace-aesthetic)
- Remove all decorative icon containers (the colored rounded-xl boxes)

**3. Numbered Featured Collection**
- The curated 4-product grid gets subtle rank numbers (#1–#4) as overlay badges, reinforcing the "hand-picked" narrative

**4. "New This Week" → Timeline Accent**
- Add a subtle green left-border accent on new product cards and a "NEW" chip, making them instantly scannable
- Remove the bg-muted/30 section background — keep everything flat

**5. "Popular Picks" → Download Count Badges**
- Show the actual download count on each card as a small inline badge (e.g., "1.2k downloads"), giving social proof — enterprise marketplaces always surface engagement metrics

**6. Remove Bottom CTA**
- The generic "Looking for something specific?" section adds no value — the sidebar already has "All Products". Remove it entirely.

**7. Mobile: Stack hero vertically**
- On mobile, the hero product becomes a compact card (aspect-[16/9]) with overlay text, no wasted vertical space

### Files Changed
- `src/pages/Featured.tsx` — Full visual refactor (same data, new layout)
