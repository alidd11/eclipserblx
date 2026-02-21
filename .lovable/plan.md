

## Seller Promotions System (Paid Featured Listings)

This feature lets sellers spend Eclipse Credits to promote their products to premium positions on the marketplace — similar to BuiltByBit's "Featured Resource" system. It generates revenue for the platform while giving sellers a self-service way to boost visibility.

---

### How It Works (User Perspective)

1. **Seller goes to a new "Promote" page** in their dashboard (`/seller/promote`)
2. They pick a product they want to promote and choose a **promotion slot**:
   - **Featured Product** — appears in the "Featured" hero card on the marketplace homepage (1 slot, highest bid wins)
   - **Category Spotlight** — pinned to the top of its category page (up to 3 slots per category)
3. They set a **weekly bid** in Eclipse Credits (minimum 5 credits, increments of 1)
4. Every Monday at midnight UTC, an automated auction resolves: highest bids win slots, credits are deducted
5. Sellers can view analytics (impressions, clicks) on their active promotions
6. They can pause, edit bids, or cancel at any time

---

### What Gets Built

**1. Database Tables (3 new tables)**

- `product_promotions` — stores each promotion bid (product_id, store_id, slot_type, max_bid, current_bid, status, impressions, clicks, started_at, expires_at)
- `promotion_auctions` — log of weekly auction results (auction_date, slot_type, category_id, winners JSON)
- `promotion_analytics` — daily impression/click tracking per promotion

**2. New Seller Dashboard Page**

- `/seller/promote` — lists the seller's active and past promotions, lets them create new ones
- Product picker, slot type selector, bid amount input (from credit balance)
- Status badges: Active, Outbid, Pending Auction, Paused
- Simple analytics: impressions, clicks, CTR per promotion

**3. Marketplace Integration**

- Update `FeaturedProductCard` to prioritise products with active "featured" promotions
- Update category pages to show "Category Spotlight" promoted products pinned at top
- Add a subtle "Promoted" badge on boosted product cards

**4. Auction Edge Function**

- `resolve-promotion-auctions` — a scheduled edge function (or admin-triggered) that:
  - Finds all active bids per slot
  - Awards slots to highest bidders
  - Deducts credits via the existing `spend_credits` database function
  - Marks losers as "outbid"

**5. Quick Action in Seller Dashboard**

- Add a "Promote" quick action tile to the existing dashboard grid

---

### Technical Details

**New DB Tables:**

```sql
-- Main promotions table
CREATE TABLE public.product_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('featured', 'category_spotlight')),
  category_id UUID REFERENCES categories(id),
  max_bid NUMERIC NOT NULL DEFAULT 5,
  current_bid NUMERIC NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending_auction',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: sellers can manage their own promotions
-- Admins can view all
```

**New Files:**
- `src/pages/seller/SellerPromotions.tsx` — main promotions management page
- `src/components/seller/CreatePromotionDialog.tsx` — dialog to pick product, slot, and bid
- `src/components/seller/PromotionCard.tsx` — card showing promotion status and analytics
- `src/components/marketplace/PromotedBadge.tsx` — small "Promoted" indicator badge
- `supabase/functions/resolve-promotion-auctions/index.ts` — auction resolution logic

**Modified Files:**
- `src/pages/seller/SellerDashboard.tsx` — add "Promote" quick action
- `src/components/marketplace/FeaturedProductCard.tsx` — check for promoted products first
- `src/components/home/MarketplaceSection.tsx` — integrate promoted products
- Route config — add `/seller/promote` route

**Credit Flow:**
- Uses existing `spend_credits()` DB function when auction resolves
- Shows seller's current credit balance on the promotions page
- Links to `/wallet` for top-ups if balance is low

