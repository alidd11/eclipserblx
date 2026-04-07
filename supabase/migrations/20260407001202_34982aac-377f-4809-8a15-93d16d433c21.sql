
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS early_access_strategy text NOT NULL DEFAULT 'timed',
  ADD COLUMN IF NOT EXISTS early_access_min_orders integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS early_access_link_token text;
