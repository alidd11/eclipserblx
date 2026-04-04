

# Homepage and Store Page Improvements

---

## HOMEPAGE IMPROVEMENTS

### 1. Reduce Section Padding and Tighten Vertical Rhythm
Every section uses `py-6` or `py-8`, creating excessive whitespace on mobile. Reduce to `py-4` on most sections and `py-6` on desktop. This alone removes ~100px of dead space on a single scroll.

**Files**: `TrendingProducts.tsx`, `NewThisWeek.tsx`, `FreeAssetsTeaser.tsx`, `TopSellers.tsx`, `RecentlyViewedSection.tsx`, `WhyEclipse.tsx`, `FinalCTA.tsx`

### 2. Add Product Count Badges to Section Headers
Show how many items exist (e.g. "TRENDING NOW · 8 items") so users know the scope at a glance. Small muted count next to each header.

**Files**: `TrendingProducts.tsx`, `NewThisWeek.tsx`, `FreeAssetsTeaser.tsx`

### 3. Horizontal Scroll for "New This Week" on Mobile
Currently a 2-col grid that pushes content far down. Switch to a horizontal scroll strip on mobile (like Free Assets already does), keeping the grid on desktop. Saves significant scroll depth.

**File**: `NewThisWeek.tsx`

### 4. Improve "Top Creators" Card Density on Mobile
Currently 2-col grid with small avatars. On mobile, switch to a horizontal scroll of compact avatar+name chips (pill-shaped) so all 8 creators are visible without scrolling past. More visual, less vertical space.

**File**: `TopSellers.tsx`

### 5. Simplify "Why Eclipse" Section
The 2x2 grid of value props + trust strip takes a lot of space for static marketing copy. Merge into a single horizontal scrolling strip of icon+label badges (like trust signals). Cuts the section height by 60%.

**File**: `WhyEclipse.tsx`

### 6. Make Hero Trending Tags More Tappable
Tags are tiny (`text-[11px]`, `px-1.5 py-0.5`). Increase touch target to `px-2.5 py-1` and use `min-h-[28px]` for accessibility compliance (44px recommended, 28px minimum).

**File**: `LandingHero.tsx`

---

## STORE PAGE IMPROVEMENTS

### 7. Sticky Store Header on Scroll
When users scroll past the banner, the store name and action buttons disappear. Add a compact sticky header (logo + name + Follow/Message) that appears on scroll-down, similar to how social profiles work.

**File**: `StorePage.tsx` — new `StoreFloatingHeader` component

### 8. Show Product Count Per Category Tab in Sidebar
The Browse section lists tabs with no indication of how many products each contains. Fetch and display counts next to each tab name (already done for "All Products").

**File**: `StoreSidebar.tsx` — pass product counts per tab, or compute from products data

### 9. Improve Empty Store State
The current empty state is a plain card with an icon. Add a more engaging layout: suggest the buyer follow the store for notifications, or link to similar stores.

**File**: `StorePage.tsx` — enhance the "No Products Yet" card

### 10. Store Products Grid — Show All Instead of Paginating by 4
On mobile, only 4 products show per page with swipe pagination. This is unusual for a marketplace — users expect to scroll through products. Increase to 12 products per page on mobile (or use infinite scroll). Desktop stays at 8 per page.

**File**: `StorePage.tsx` — change `PRODUCTS_PER_PAGE_MOBILE` from 4 to 12

### 11. Add Social Proof to Store Header
Show the store's join date ("Selling since Jan 2025") and total sales count as subtle text under the stats row. Builds trust without extra UI weight.

**File**: `StorePage.tsx` — add created_at formatted date to the stats row

---

## Technical Details

| File | Changes |
|------|---------|
| `src/components/landing/TrendingProducts.tsx` | Reduce py-6 to py-4, add item count |
| `src/components/landing/NewThisWeek.tsx` | Horizontal scroll on mobile, reduce padding |
| `src/components/landing/TopSellers.tsx` | Horizontal scroll chips on mobile |
| `src/components/landing/WhyEclipse.tsx` | Merge into single strip |
| `src/components/landing/FreeAssetsTeaser.tsx` | Reduce padding |
| `src/components/landing/RecentlyViewedSection.tsx` | Reduce padding |
| `src/components/landing/FinalCTA.tsx` | Reduce padding |
| `src/components/landing/LandingHero.tsx` | Larger tag touch targets |
| `src/pages/StorePage.tsx` | Sticky header, increase mobile products per page, join date, better empty state |
| `src/components/store/StoreSidebar.tsx` | Product counts per tab |

No database changes required. All changes are UI/UX refinements.

