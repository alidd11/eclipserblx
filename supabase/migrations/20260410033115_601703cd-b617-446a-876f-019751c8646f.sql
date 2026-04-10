-- Fix 1 (CRITICAL): Revoke public access to get_user_email to prevent email enumeration
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM PUBLIC, authenticated, anon;

-- Fix 2 (LOW): Grant anon SELECT on products to silence external bot permission errors
-- RLS is already enabled with policies restricting to approved/active products only
GRANT SELECT ON public.products TO anon;