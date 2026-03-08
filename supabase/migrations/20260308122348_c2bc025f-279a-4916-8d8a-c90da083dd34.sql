
CREATE OR REPLACE FUNCTION public.list_staff_members()
RETURNS TABLE(user_id uuid, display_name text, last_seen timestamptz, roles text[])
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  status_roles text[] := ARRAY['eclipse_plus_member', 'seller', 'customer'];
BEGIN
  -- Only allow staff to call this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.custom_roles cr ON cr.name = ur.role
    WHERE ur.user_id = auth.uid()
      AND cr.is_status_role = false
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.last_seen,
    array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role != ALL(status_roles)
  GROUP BY p.user_id, p.display_name, p.last_seen;
END;
$$;
