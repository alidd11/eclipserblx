

# Fix Desktop Layout — Professional Full-Width Design

## Problems

1. **No max-width container** — On 1920px screens, content stretches edge-to-edge with only 32px padding (`lg:px-8`). Product grids at 4 columns become absurdly wide (~450px per card). Headers and text span the full viewport. This looks amateur on large monitors.

2. **Product grids too sparse** — Only 4 columns (`lg:grid-cols-4`) on desktop. At 1440px+ this wastes space. Should scale to 5-6 columns on XL screens.

3. **Hero not designed for desktop** — Centered text block with no visual weight. On a wide monitor it looks like a tiny paragraph floating in space.

4. **Eclipse+ remnants still present** — `FinalCTA.tsx` still links to `/eclipse-plus` with "Explore Eclipse+" button. `WhyEclipse.tsx` still mentions "Eclipse+ Savings".

5. **No desktop content max-width** — Professional sites (Steam, Roblox Creator Hub, BuiltByBit) all use a max-width container (typically 1400-1600px) centered on screen.

---

## Plan

### 1. Add a global desktop max-width container
Wrap the main content area in LayoutShell with a centered `max-w-[1400px] mx-auto` container on desktop. This gives breathing room on ultra-wide monitors while keeping content readable.

**File**: `src/components/layout/LayoutShell.tsx`

### 2. Scale product grids for larger screens
Add `xl:grid-cols-5 2xl:grid-cols-6` breakpoints to all product grid sections so cards scale properly on wider monitors.

**Files**: `TrendingProducts.tsx`, `NewThisWeek.tsx`, `OnSaleProducts.tsx`, `RecentReleases.tsx`, `FreeAssetsTeaser.tsx`

### 3. Improve desktop hero
Make the hero more impactful on desktop:
- Increase heading size from `lg:text-[2.75rem]` to `lg:text-5xl`
- Widen the max-width constraint on text
- Add more vertical padding on desktop

**File**: `src/components/landing/LandingHero.tsx`

### 4. Fix header desktop layout
Add `max-w-[1400px] mx-auto` to the header nav so it aligns with the content container below.

**File**: `src/components/layout/Header.tsx`

### 5. Align category bar with content
Same `max-w-[1400px] mx-auto` treatment for the category bar.

**File**: `src/components/shop/GlobalCategoryBar.tsx`

### 6. Remove final Eclipse+ remnants
- **FinalCTA.tsx**: Remove the "Explore Eclipse+" button
- **WhyEclipse.tsx**: Replace "Eclipse+ Savings" with a different badge (e.g. "Best Prices")

### 7. Polish desktop spacing
Increase section padding on large screens — `lg:py-8` instead of `sm:py-6` — to give sections more breathing room on desktop.

---

## Files to Modify

| File | Change |
|------|--------|
| `LayoutShell.tsx` | Add max-width container to main content |
| `Header.tsx` | Add max-width to desktop nav |
| `GlobalCategoryBar.tsx` | Add max-width alignment |
| `LandingHero.tsx` | Scale up hero for desktop |
| `TrendingProducts.tsx` | Add xl/2xl grid columns |
| `NewThisWeek.tsx` | Add xl/2xl grid columns |
| `OnSaleProducts.tsx` | Add xl/2xl grid columns |
| `RecentReleases.tsx` | Add xl/2xl grid columns |
| `FreeAssetsTeaser.tsx` | Already has 6 cols, add alignment |
| `FinalCTA.tsx` | Remove Eclipse+ button |
| `WhyEclipse.tsx` | Replace Eclipse+ badge |

## Technical Notes
- ~11 files modified
- No database changes
- No new dependencies
- Consistent `max-w-[1400px] mx-auto` pattern across header, category bar, and main content

