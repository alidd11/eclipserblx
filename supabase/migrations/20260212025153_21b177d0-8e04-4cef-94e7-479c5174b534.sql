
-- Add IP and user agent tracking to download_logs
ALTER TABLE public.download_logs 
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create a function to check download rate limits per product per user
-- Returns true if user can download, false if rate limited
CREATE OR REPLACE FUNCTION public.check_download_rate_limit(
  p_user_id UUID,
  p_product_id UUID,
  p_max_downloads_per_day INTEGER DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.download_logs
  WHERE user_id = p_user_id
    AND product_id = p_product_id
    AND downloaded_at > (now() - interval '24 hours');
  
  RETURN recent_count < p_max_downloads_per_day;
END;
$$;

-- Create a function to count total downloads per user across all products in a time window
CREATE OR REPLACE FUNCTION public.check_global_download_rate_limit(
  p_user_id UUID,
  p_max_downloads_per_hour INTEGER DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.download_logs
  WHERE user_id = p_user_id
    AND downloaded_at > (now() - interval '1 hour');
  
  RETURN recent_count < p_max_downloads_per_hour;
END;
$$;

-- Add index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_download_logs_user_product_time 
  ON public.download_logs (user_id, product_id, downloaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_download_logs_user_time 
  ON public.download_logs (user_id, downloaded_at DESC);
