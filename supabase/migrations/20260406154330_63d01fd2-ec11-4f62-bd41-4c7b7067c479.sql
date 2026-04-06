-- 1. Remove the overly broad discount codes SELECT policy
DROP POLICY IF EXISTS "Authenticated users can validate discount codes" ON public.seller_discount_codes;

-- 2. Harden is_staff() to use explicit role allowlist instead of is_status_role flag
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin', 'lead_administrator', 'lead_manager', 'support_agent', 'recruiter', 'analyst', 'developer')
  )
$$;
