ALTER TABLE public.store_credentials
  ADD COLUMN IF NOT EXISTS cloudflare_api_token TEXT,
  ADD COLUMN IF NOT EXISTS cloudflare_zone_id TEXT;