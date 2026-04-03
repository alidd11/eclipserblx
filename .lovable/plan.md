

# Full Ad System Overhaul: Spend-Based CPC/CPM + Multi-Page Placements

## Current State
- Ads only appear on Homepage (hero banner, store spotlight)
- Auction-based model with limited slots (weekly Monday resolution)
- No ads on `/products`, search results, product detail, or category pages
- No CPC/CPM billing -- just flat weekly bids

## New Model: Spend-Based (No Slot Limits)

Instead of competing for limited slots, **every active campaign gets shown**. Visibility is proportional to budget -- higher spenders get more impressions. No auctions, no waiting for Monday.

### Pricing Options (seller chooses one per campaign)
- **CPC (Cost Per Click)**: Seller sets a max CPC (e.g. £0.05). Charged per unique click. Budget depletes in real-time
- **CPM (Cost Per 1000 Impressions)**: Seller sets a CPM rate (e.g. £1.00). Charged per 1000 impressions served

### How Visibility Works
- All active campaigns with remaining budget are eligible to show
- A weighted random selection picks which ad to display based on the campaign's bid amount relative to other active campaigns in the same placement
- Higher CPC/CPM = more frequent display, but everyone gets some exposure
- Campaign auto-pauses when daily budget or total budget is exhausted

## Ad Placements (5 zones)

1. **Homepage Hero** (existing) -- promoted product banner with `PromotedBadge`
2. **Products Listing** (`/products`) -- 1 promoted card injected at position 3 in the grid, styled like a regular `ProductCard` but with a `PromotedBadge`
3. **Search Results** (`/search`) -- 1 promoted card at position 2 in results
4. **Product Detail Sidebar** (`/product/:slug`) -- "Sponsored" product recommendation card in the sidebar/below-the-fold area
5. **Category Pages** -- 1 promoted card at top of filtered results when browsing a specific category

All placements track impressions (via `increment_promotion_impression`) and clicks.

## Database Changes

Add/modify columns on `product_promotions`:
- `pricing_model` (text, default 'cpc') -- 'cpc' or 'cpm'
- `cpc_bid` (numeric, nullable) -- cost per click bid
- `cpm_bid` (numeric, nullable) -- cost per 1000 impressions bid
- `daily_budget_limit` (numeric, nullable) -- daily spend cap
- `total_budget` (numeric, not null) -- total campaign budget
- `placement_zones` (text[], default '{homepage}') -- which zones to show in
- Remove reliance on `slot_type` for the new model (keep for backward compat)

New RPC function: `record_promotion_click` -- atomically increments clicks, calculates cost, deducts from budget, updates `total_spent`, auto-pauses if budget exhausted.

New RPC function: `charge_promotion_impression` -- called every 1000 impressions batch, deducts CPM cost from budget.

New RPC function: `get_weighted_promotion` -- given a placement zone, returns a campaign ID selected by weighted random based on active bids.

## Component Changes

### New: `src/hooks/usePromotedProduct.ts`
- Reusable hook: `usePromotedProduct(zone: string, categoryId?: string)`
- Calls `get_weighted_promotion` RPC, returns product data
- Tracks impression on mount via `increment_promotion_impression`
- Handles click tracking (wraps product link to record click + charge CPC)

### Modified: `src/pages/Products.tsx`
- Import `usePromotedProduct('products_listing')`
- Inject promoted ProductCard at grid position 3 with `PromotedBadge` overlay

### Modified: `src/pages/SearchResults.tsx`
- Import `usePromotedProduct('search_results')`
- Inject promoted ProductCard at position 2

### Modified: `src/pages/ProductDetail.tsx`
- Import `usePromotedProduct('product_detail')`
- Add "Sponsored" recommendation card in sidebar area

### Modified: `src/components/marketplace/FeaturedProductCard.tsx`
- Switch from auction-winner query to `usePromotedProduct('homepage_hero')`

### Modified: `src/components/seller/CreateCampaignWizard.tsx`
- Replace auction/bid step with CPC/CPM pricing selector
- Add placement zone multi-select (checkboxes for each zone)
- Add total budget field + daily cap
- Remove `pending_auction` status -- campaigns go straight to `active` (or `in_review` if moderation needed)
- Update insert to use new columns

### Modified: `src/components/seller/CampaignRow.tsx`
- Show pricing model badge (CPC/CPM)
- Show real-time spend vs budget progress bar
- Show cost-per-result metric

### Modified: `src/pages/seller/SellerPromotions.tsx`
- Update "How it works" section to explain spend-based model
- Add CPC/CPM averages to metric cards

## Files Summary
- **New**: `src/hooks/usePromotedProduct.ts`
- **Modified**: `CreateCampaignWizard.tsx`, `CampaignRow.tsx`, `SellerPromotions.tsx`, `Products.tsx`, `SearchResults.tsx`, `ProductDetail.tsx`, `FeaturedProductCard.tsx`
- **Database**: Migration adding new columns + 3 RPC functions
- **NOT modified**: Discord ads system, admin analytics, track-ad-click edge function

