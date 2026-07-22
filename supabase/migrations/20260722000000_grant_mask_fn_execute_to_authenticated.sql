-- affiliate_payouts_safe (and other *_safe views) are security_invoker=on and
-- call mask_email()/mask_token() to redact sensitive columns. Those functions
-- had no EXECUTE grant for `authenticated`, so a staff admin selecting the view
-- hit "permission denied for function mask_email" → PostgREST 403, breaking the
-- /admin/affiliates payouts list. The functions are pure string maskers (they
-- expose nothing), and row visibility is still governed by the underlying
-- table's RLS, so granting EXECUTE is safe.

GRANT EXECUTE ON FUNCTION public.mask_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_token(text) TO authenticated;
