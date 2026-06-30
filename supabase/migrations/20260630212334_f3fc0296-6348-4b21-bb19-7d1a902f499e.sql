
REVOKE SELECT ON public.page_visits_daily_summary FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_page_visits_daily_summary(days integer DEFAULT 30)
RETURNS TABLE (day date, visits bigint, new_visitors bigint, unique_paths bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::text) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;
  RETURN QUERY
    SELECT s.day, s.visits, s.new_visitors, s.unique_paths
    FROM public.page_visits_daily_summary s
    WHERE s.day >= (current_date - (days || ' days')::interval)::date
    ORDER BY s.day DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_page_visits_daily_summary(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_page_visits_daily_summary(integer) TO authenticated;
