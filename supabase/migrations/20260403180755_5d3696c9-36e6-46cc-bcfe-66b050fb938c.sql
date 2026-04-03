
-- Migrate any pending_auction rows to scheduled
UPDATE public.product_promotions SET status = 'scheduled' WHERE status = 'pending_auction';

-- Drop legacy columns from product_promotions
ALTER TABLE public.product_promotions DROP COLUMN IF EXISTS slot_type;
ALTER TABLE public.product_promotions DROP COLUMN IF EXISTS max_bid;
ALTER TABLE public.product_promotions DROP COLUMN IF EXISTS current_bid;
ALTER TABLE public.product_promotions DROP COLUMN IF EXISTS budget_type;
ALTER TABLE public.product_promotions DROP COLUMN IF EXISTS daily_budget;

-- Drop the promotion_auctions table
DROP TABLE IF EXISTS public.promotion_auctions;
