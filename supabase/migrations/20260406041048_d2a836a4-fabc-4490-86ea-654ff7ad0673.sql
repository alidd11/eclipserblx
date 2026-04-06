
-- Drop the existing view first to avoid column name conflict
DROP VIEW IF EXISTS public.store_domains_public;

-- Recreate with safe columns only (no verification_token, no cloudflare_hostname_id)
CREATE VIEW public.store_domains_public
WITH (security_invoker = false)
AS
SELECT
  domain,
  store_id,
  domain_type,
  is_primary,
  status
FROM public.store_domains
WHERE status = 'active';

-- Grant access
GRANT SELECT ON public.store_domains_public TO anon;
GRANT SELECT ON public.store_domains_public TO authenticated;
