-- Atomic increment function for ad click counts to prevent race conditions
CREATE OR REPLACE FUNCTION public.increment_ad_clicks(p_ad_id uuid, p_is_unique boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE discord_advertisements
  SET 
    total_clicks = COALESCE(total_clicks, 0) + 1,
    unique_clicks = CASE WHEN p_is_unique THEN COALESCE(unique_clicks, 0) + 1 ELSE unique_clicks END,
    last_clicked_at = now()
  WHERE id = p_ad_id;
END;
$$;