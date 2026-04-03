
-- Add campaign management columns to product_promotions
ALTER TABLE public.product_promotions
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS goal text NOT NULL DEFAULT 'clicks',
  ADD COLUMN IF NOT EXISTS target_devices text[],
  ADD COLUMN IF NOT EXISTS target_countries text[],
  ADD COLUMN IF NOT EXISTS daily_budget numeric,
  ADD COLUMN IF NOT EXISTS budget_type text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS creative_images text[],
  ADD COLUMN IF NOT EXISTS total_spent numeric NOT NULL DEFAULT 0;
