
# Desktop Landing Page Enhancement - Fill Empty Space

## Overview

Transform the desktop hero section to eliminate empty black space by adding a featured products showcase, similar to ClearlyDev's content-rich approach.

## Changes

### 1. Two-Column Hero Layout

Restructure `src/components/landing/LandingHero.tsx` from centered text-only to a split layout:

```text
+------------------------------------------+
|  LEFT SIDE (55%)    |   RIGHT SIDE (45%) |
|                     |                    |
|  Badge              |   Featured         |
|  Headline           |   Products         |
|  Description        |   Showcase         |
|  CTA Buttons        |   (3-4 Cards)      |
|                     |                    |
+------------------------------------------+
```

### 2. New Component: HeroProductShowcase

Create `src/components/landing/HeroProductShowcase.tsx`:
- Vertical stack of 3-4 featured products
- Compact card design with thumbnail, product name, store info
- "FEATURED" badge on cards
- Staggered fade-in animation
- Links to product pages

### 3. Layout Adjustments

- Reduce hero height from `min-h-[70vh]` to `min-h-[55vh]`
- Use CSS Grid for the two-column layout
- Right column only visible on `lg` screens and above
- Mobile remains single-column centered layout

### 4. Data Source

Reuse existing featured products query pattern:
- Filter by `is_featured = true`
- Active stores only, non-testing
- Limit to 4 products
- Include store logo and verification badges

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/landing/LandingHero.tsx` | Modify to two-column grid layout |
| `src/components/landing/HeroProductShowcase.tsx` | Create new component |

## Responsive Behavior

| Viewport | Layout |
|----------|--------|
| Desktop (lg+) | Two columns with product showcase |
| Tablet/Mobile | Single column, showcase hidden |
