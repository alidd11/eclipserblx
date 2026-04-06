

# Homepage Redesign — Enterprise-Grade Visual Overhaul

## Current State

The homepage has the right structure but lacks visual impact. The hero section is plain text over a dim background with minimal contrast. The section flow (Trending → Promotions → Recent Releases → On Sale → Free Assets → Recently Viewed → For You → CTA) is functional but visually monotonous — every section uses the same pattern: icon + uppercase header + product grid/carousel on a flat dark background with no visual breaks.

## Design Philosophy

Inspired by Shopify, Gumroad, and ClearlyDev — create clear visual hierarchy through alternating section treatments, stronger hero presence, and subtle background variation to break up the vertical scroll into distinct "zones." The design must be device-agnostic and scale from 320px to ultrawide.

## Changes

### 1. Hero Section — Stronger Visual Impact
**File: `src/components/landing/LandingHero.tsx`**
- Increase hero vertical padding on desktop (`lg:py-20`) for breathing room
- Scale up the heading to `lg:text-6xl` with tighter letter-spacing
- Add a subtle animated gradient text effect on "Marketplace" using CSS `background-clip: text`
- Make the subtitle slightly larger (`lg:text-lg`) with improved line height
- Add a secondary stat strip below the CTA buttons (e.g., "1,000+ Assets · 200+ Sellers · Instant Delivery") using real or approximate data — styled as muted pill badges
- On mobile: keep compact but add the stat strip as a single scrollable row

### 2. Hero Banner — Richer Backdrop
**File: `src/components/landing/HeroBanner.tsx`**
- Replace the flat `bg-background/50` overlay with a radial gradient that creates a spotlight effect behind the text: `radial-gradient(ellipse at 50% 40%, hsl(235 86% 65% / 0.08), transparent 70%)`
- Add a very subtle animated CSS shimmer line at the bottom edge using a `@keyframes` rule — no JS, pure CSS

### 3. Trending Section — Featured Hero Card
**File: `src/components/landing/TrendingProducts.tsx`**
- On desktop (`lg`+), render the #1 trending product as a larger featured card spanning 2 columns in the masonry, with a gradient overlay showing rank + name
- Keep the remaining 7 products in the standard masonry layout
- On mobile: no change (masonry columns already adapt)

### 4. Visual Section Separators
**File: `src/pages/Landing.tsx`**
- Add subtle `border-t border-border` dividers between major sections
- Alternate: give every other section a slightly tinted background using `bg-muted/5` on a wrapper div — creates visual "bands" that guide the eye without heavy cards

### 5. Section Headers — Refined Typography
**Files: All section components (TrendingProducts, RecentReleases, OnSaleProducts, FreeAssetsTeaser)**
- Standardize section headers: remove the colored icon backgrounds (the `p-1.5 rounded-lg bg-*/10` wrappers) and replace with a cleaner left-border accent pattern: `border-l-2 border-primary pl-3`
- This creates a more editorial, enterprise feel vs. the current "badge + icon" pattern

### 6. Final CTA — More Compelling
**File: `src/components/landing/FinalCTA.tsx`**
- Add a subtle gradient border using CSS (`border-image` or pseudo-element) instead of the plain `border-border`
- Add 2-3 trust signals below the CTA button (e.g., "No listing fees · Lower commission · Instant payouts") as muted text

### 7. Global CSS Additions
**File: `src/index.css`**
- Add a `@keyframes hero-shimmer` for the hero bottom-edge effect
- Add `.text-gradient-hero` utility for the gradient text effect
- Add `.section-band` utility for alternating section backgrounds

### 8. Responsive Consistency
All changes use Tailwind responsive prefixes (`sm:`, `lg:`, `xl:`) so they automatically adapt. No separate mobile/tablet implementations needed — the same markup scales down gracefully through:
- Reduced padding and font sizes on smaller breakpoints
- Masonry columns reducing from 5→3→2
- Horizontal scroll carousels on mobile, grids on desktop (already in place)

## Files Modified
1. `src/components/landing/LandingHero.tsx` — hero layout + stat strip
2. `src/components/landing/HeroBanner.tsx` — richer backdrop
3. `src/components/landing/TrendingProducts.tsx` — featured #1 card
4. `src/components/landing/RecentReleases.tsx` — header style
5. `src/components/landing/OnSaleProducts.tsx` — header style
6. `src/components/landing/FreeAssetsTeaser.tsx` — header style
7. `src/components/landing/FinalCTA.tsx` — gradient border + trust signals
8. `src/pages/Landing.tsx` — section band wrappers + dividers
9. `src/index.css` — CSS utilities for gradient text, shimmer, section bands

## What This Does NOT Change
- No new dependencies or libraries
- No structural changes to the layout shell, sidebar, or header
- No database changes
- Product card component untouched — only the container/section layouts improve
- All existing responsive patterns preserved

