ALTER TABLE public.store_credentials 
  ADD COLUMN IF NOT EXISTS orders_channel_id text,
  ADD COLUMN IF NOT EXISTS refunds_channel_id text,
  ADD COLUMN IF NOT EXISTS disputes_channel_id text,
  ADD COLUMN IF NOT EXISTS sales_channel_id text;