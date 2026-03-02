
CREATE OR REPLACE FUNCTION public.increment_promotion_impression(p_promotion_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.promotion_analytics (promotion_id, date, impressions, clicks)
  VALUES (p_promotion_id, p_date, 1, 0)
  ON CONFLICT (promotion_id, date) DO UPDATE
  SET impressions = promotion_analytics.impressions + 1;
END;
$$;
