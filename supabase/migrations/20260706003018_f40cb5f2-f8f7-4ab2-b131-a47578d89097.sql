
-- ============================================================
-- 1) products.early_access_link_token — hide from anon
-- ============================================================
REVOKE SELECT (early_access_link_token) ON public.products FROM anon;
-- authenticated + service_role keep column-level access; row-level RLS still
-- restricts who can see which rows.
GRANT SELECT (early_access_link_token) ON public.products TO authenticated, service_role;

-- ============================================================
-- 2) stores — hide financial columns from anon
-- ============================================================
REVOKE SELECT (
  total_revenue,
  commission_rate,
  custom_commission_rate,
  custom_rate_set_at,
  custom_rate_set_by,
  custom_rate_expires_at
) ON public.stores FROM anon;

GRANT SELECT (
  total_revenue,
  commission_rate,
  custom_commission_rate,
  custom_rate_set_at,
  custom_rate_set_by,
  custom_rate_expires_at
) ON public.stores TO authenticated, service_role;

-- ============================================================
-- 3) seller_agreements — drop the overly broad public policy
--    and expose a targeted existence check via SECURITY DEFINER
-- ============================================================
DROP POLICY IF EXISTS "Anyone can check agreement existence" ON public.seller_agreements;

CREATE OR REPLACE FUNCTION public.store_has_signed_agreement(
  _store_id uuid,
  _version text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_agreements
    WHERE store_id = _store_id
      AND agreement_version = _version
  );
$$;

REVOKE ALL ON FUNCTION public.store_has_signed_agreement(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_has_signed_agreement(uuid, text) TO anon, authenticated, service_role;
