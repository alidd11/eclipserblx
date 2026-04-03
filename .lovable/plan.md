
# Remove Old Auction System from Seller Ad Manager

Clean up all auction-era remnants from the seller promotion system while preserving the Discord ads system (which uses `ad_schedule_slots` and `AdSlotPicker` — those are unrelated and stay untouched).

## What's Being Removed

### Database
- Drop the `promotion_auctions` table (no longer used — the new system has no auctions)
- Drop columns from `product_promotions`: `slot_type`, `max_bid`, `current_bid`, `budget_type`, `daily_budget` (replaced by `pricing_model`, `cpc_bid`, `cpm_bid`, `total_budget`, `daily_budget_limit`)
- Migrate any existing rows with `status = 'pending_auction'` to `status = 'scheduled'` (currently 0 rows, but safe to include)

### Code Cleanup

**`src/components/seller/CampaignRow.tsx`**
- Remove `slot_type`, `max_bid`, `current_bid` from the Campaign interface
- Remove `pending_auction` and `outbid` from `statusConfig` (replace with `in_review` if needed)
- Update `isToggleable` to only include `active` and `paused`

**`src/pages/seller/SellerPromotions.tsx`**
- Remove `pending_auction` from the `pendingCampaigns` filter — use `scheduled` and `in_review` only
- Remove `outbid` from `pastCampaigns` filter
- Remove "no auctions, no waiting" copy (auction concept no longer needs contrasting)

**`src/components/seller/CreatePromotionDialog.tsx`**
- Delete this file entirely — it's the old auction-based dialog, fully replaced by `CreateCampaignWizard.tsx`

**`src/components/seller/PromotionCard.tsx`**
- Delete this file — old card component replaced by `CampaignRow.tsx`

### What Stays Untouched
- `AdSlotPicker.tsx` — used by Discord ads (`/advertise`), completely separate system
- `ad_schedule_slots` table — Discord ad scheduling, not seller promotions
- `MyAdvertisementsPage.tsx` — Discord ad management page
- All new CPC/CPM logic, `usePromotedProduct`, placement zones

## Files Modified
- `src/components/seller/CampaignRow.tsx` — remove auction fields and statuses
- `src/pages/seller/SellerPromotions.tsx` — remove auction references in filters/copy
- Database migration — drop `promotion_auctions` table, drop legacy columns

## Files Deleted
- `src/components/seller/CreatePromotionDialog.tsx`
- `src/components/seller/PromotionCard.tsx`
