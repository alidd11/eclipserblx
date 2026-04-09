

## Plan: Switch Mobile Product Grid to 1 Column

### Change
Update all product grids from `grid-cols-2` to `grid-cols-1` on mobile (below `sm` breakpoint), so each product card takes the full width. This gives larger, more visible images on phones.

### Files to update

| File | Change |
|------|--------|
| `src/components/ui/ProductCard.tsx` | No grid change needed (card is grid-agnostic) |
| `src/components/landing/TrendingProducts.tsx` | `grid-cols-2` → `grid-cols-1` (keep `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) |
| `src/components/landing/NewThisWeek.tsx` | Same pattern for the horizontal scroll strip / grid |
| `src/components/landing/RecentReleases.tsx` | Same grid update |
| `src/components/landing/OnSaleProducts.tsx` | Same grid update |
| `src/components/landing/FreeAssetsTeaser.tsx` | Same grid update |
| `src/components/store/StoreProductGrid.tsx` | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` |
| `src/pages/Products.tsx` | Same grid update |
| `src/components/ui/ProductCardSkeleton.tsx` | Update skeleton grid if used standalone |

All grids become: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

Horizontal scroll strips on mobile (NewThisWeek, FreeAssetsTeaser) will keep their scroll behavior since they use `flex` on mobile, not grid.

