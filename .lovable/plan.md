

# Eclipse v3.2 — Priority Implementation Plan

## What We're Building

Three high-impact changes selected from the directive: **Homepage Conversion**, **Free Assets Page**, and **Search Ranking Overhaul**.

---

## 1. Homepage Conversion Redesign

**Current state:** Landing page has Hero → Promotions → Marketplace (stores/products toggle) → For You. Missing dedicated Trending, Free Assets, Featured Creators, Why Eclipse, and Trust Bar sections.

**Changes to `Landing.tsx`:**
Restructure section order to match the directive's conversion funnel:

```
Hero (keep existing, update copy)
  → Trending Products (NEW section)
  → Categories Grid (move up from inside MarketplaceSection)
  → Free Assets Highlight (NEW — teaser row linking to /free)
  → Featured Creators (NEW — top verified stores horizontal scroll)
  → Why Eclipse (NEW — 3-4 value props grid)
  → Trust Bar (NEW — stats: products sold, creators, secure payments)
  → Final CTA (NEW — "Start Selling" / "Browse Marketplace")
  → For You (keep)
```

**New components to create:**
- `src/components/landing/TrendingProducts.tsx` — Fetches products ordered by `total_sales` (last 24h proxy via recent orders), horizontal scroll on mobile, grid on desktop
- `src/components/landing/FreeAssetsTeaser.tsx` — Shows 4-6 free products (price = 0) with "View All Free Assets →" link to `/free`
- `src/components/landing/FeaturedCreators.tsx` — Horizontal scroll of top verified/trusted stores
- `src/components/landing/WhyEclipse.tsx` — 4-column grid: Discord Ecosystem, AI Security, Eclipse+ Savings, Seller Tools
- `src/components/landing/TrustBar.tsx` — Stats row: total products, total creators, "Secure Payments"
- `src/components/landing/FinalCTA.tsx` — Full-width CTA banner

**Hero updates (`LandingHero.tsx`):**
- Change headline to broader positioning: "The all-in-one marketplace for Roblox creators"
- Keep existing CTA structure but ensure "Browse Marketplace" is primary

**MarketplaceSection:** Keep as-is but move `CategoriesGrid` call up to Landing level for earlier visibility.

---

## 2. Free Assets Page (`/free`)

**New route:** `/free` → `src/pages/FreeAssets.tsx`

**Features:**
- Query products where `price = 0` and `is_active = true` from active, non-testing stores
- Category filter chips (horizontal scroll)
- Sort by: newest, most popular, rating
- Infinite scroll product grid using existing `ProductCard` component
- SEO meta via `usePageMeta`
- Zero-commission messaging in a banner: "All free assets — no fees, no catch"

**Route registration:** Add to `AppRoutes.tsx` as a lazy-loaded public route.

**Cross-links:**
- Add "Free Assets" to main navigation/header
- Homepage `FreeAssetsTeaser` links here
- Search filters get a "Free" toggle

---

## 3. Search Ranking Overhaul

**Current state:** Search uses basic text matching with `pg_trgm` indexes, sorted by `total_sales` for trending. No weighted scoring.

**Implementation — database function:**

Create a new RPC function `search_products_ranked` that implements the weighted score:

```sql
SCORE = (text_relevance * 0.35) + (sales_score * 0.20) + (conversion_score * 0.15) 
      + (rating_score * 0.10) + (recency_score * 0.10) + (trending_score * 0.10)
```

- **text_relevance**: `similarity()` score from `pg_trgm` on name + description
- **sales_score**: Normalized `total_sales` (0-1 scale vs max)
- **conversion_score**: Derived from `total_sales / total_views` if view tracking exists, else fallback to sales
- **rating_score**: `average_rating / 5.0`
- **recency_score**: Decay function based on `created_at` (1.0 for today → 0 after 90 days)
- **trending_score**: Sales in last 24h normalized

**Database migration:** Create `search_products_ranked` as a SECURITY DEFINER function with parameters for query text, category filter, price range, free-only filter, and pagination.

**Frontend changes (`SearchResults.tsx`):**
- When sort = "relevance", call `search_products_ranked` RPC instead of raw query
- Add "Free" filter toggle to search filters
- Add "Verified" filter toggle

**Edge function (`smart-search`):** Update to use the new RPC when available.

---

## Technical Notes

- All new sections use `LazySection` + `Suspense` + `SectionErrorBoundary` for performance
- All new sections use `ScrollReveal` for entrance animations
- Mobile-first: horizontal scroll carousels on mobile, grids on desktop
- Skeleton loaders for every new section
- No rebuilds of existing components — only additions and reordering

---

## Estimated Scope

| Area | Files Created | Files Modified |
|------|--------------|----------------|
| Homepage | 6 new components | Landing.tsx |
| Free Assets | 1 page | AppRoutes.tsx, navigation |
| Search Ranking | 1 DB migration | SearchResults.tsx, smart-search |

