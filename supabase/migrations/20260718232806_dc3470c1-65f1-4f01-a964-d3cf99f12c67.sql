
CREATE OR REPLACE FUNCTION public.can_assign_role(_assigner_id uuid, _target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _target_role = 'admin' THEN
        public.get_user_email(_assigner_id) = 'alicanimir1@gmail.com'
      ELSE
        public.get_user_max_hierarchy(_assigner_id) >= (
          SELECT hierarchy_level FROM public.custom_roles WHERE name = _target_role
        )
    END
$$;

CREATE OR REPLACE FUNCTION public.platform_ledger_summary(
  _store_id uuid DEFAULT NULL,
  _date_from timestamptz DEFAULT NULL,
  _date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_gross numeric,
  total_commission numeric,
  total_stripe numeric,
  total_net numeric,
  tx_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(gross_amount), 0),
    COALESCE(SUM(platform_fee), 0),
    COALESCE(SUM(stripe_fee), 0),
    COALESCE(SUM(net_amount), 0),
    COUNT(*)
  FROM public.seller_transactions
  WHERE public.is_staff(auth.uid())
    AND type = 'sale'
    AND refunded_at IS NULL
    AND (_store_id IS NULL OR store_id = _store_id)
    AND (_date_from IS NULL OR created_at >= _date_from)
    AND (_date_to IS NULL OR created_at <= _date_to)
$$;

REVOKE ALL ON FUNCTION public.platform_ledger_summary(uuid, timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.platform_ledger_summary(uuid, timestamptz, timestamptz) TO authenticated;
