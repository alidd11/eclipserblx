ALTER TABLE public.store_domains ADD COLUMN IF NOT EXISTS is_cloudflare_zone boolean DEFAULT false;
ALTER TABLE public.store_domains ADD COLUMN IF NOT EXISTS last_health_check jsonb DEFAULT null;
ALTER TABLE public.store_domains ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz DEFAULT null;