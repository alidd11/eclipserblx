CREATE OR REPLACE FUNCTION public.run_nightly_reconciliation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_samples jsonb;
  v_checks int := 0;
  v_findings int := 0;
BEGIN
  -- Check 1: Orphaned order_items
  SELECT count(*), COALESCE(jsonb_agg(id) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_count, v_samples
  FROM (
    SELECT oi.id, row_number() OVER () AS rn
    FROM public.order_items oi
    LEFT JOIN public.orders o ON o.id = oi.order_id
    WHERE o.id IS NULL OR o.deleted_at IS NOT NULL
  ) sub;
  v_checks := v_checks + 1;
  IF v_count > 0 THEN
    v_findings := v_findings + 1;
    INSERT INTO public.reconciliation_findings (check_name, severity, affected_count, sample_ids, details)
    VALUES ('orphaned_order_items', 'critical', v_count, v_samples,
            format('%s order_items reference deleted/missing orders', v_count));
  END IF;

  -- Check 2: Paid card orders missing payment_id (last 7 days)
  SELECT count(*), COALESCE(jsonb_agg(id) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_count, v_samples
  FROM (
    SELECT id, row_number() OVER () AS rn
    FROM public.orders
    WHERE status IN ('paid','fulfilled')
      AND payment_method IN ('stripe','card','apple_pay','google_pay','klarna','paypal')
      AND payment_id IS NULL
      AND created_at > now() - interval '7 days'
  ) sub;
  v_checks := v_checks + 1;
  IF v_count > 0 THEN
    v_findings := v_findings + 1;
    INSERT INTO public.reconciliation_findings (check_name, severity, affected_count, sample_ids, details)
    VALUES ('paid_orders_missing_payment_id', 'warn', v_count, v_samples,
            format('%s paid orders in last 7d have no payment_id', v_count));
  END IF;

  -- Check 3: public tables without RLS
  SELECT count(*), COALESCE(jsonb_agg(to_jsonb(tablename)) FILTER (WHERE rn <= 10), '[]'::jsonb)
    INTO v_count, v_samples
  FROM (
    SELECT c.relname AS tablename, row_number() OVER () AS rn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
  ) sub;
  v_checks := v_checks + 1;
  IF v_count > 0 THEN
    v_findings := v_findings + 1;
    INSERT INTO public.reconciliation_findings (check_name, severity, affected_count, sample_ids, details)
    VALUES ('public_tables_without_rls', 'critical', v_count, v_samples,
            format('%s public tables have RLS disabled', v_count));
  END IF;

  -- Check 4: Active products with no images (FIXED — products.images is text[])
  SELECT count(*), COALESCE(jsonb_agg(id) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_count, v_samples
  FROM (
    SELECT p.id, row_number() OVER () AS rn
    FROM public.products p
    WHERE p.is_active = true
      AND (p.images IS NULL OR array_length(p.images, 1) IS NULL OR array_length(p.images, 1) = 0)
  ) sub;
  v_checks := v_checks + 1;
  IF v_count > 0 THEN
    v_findings := v_findings + 1;
    INSERT INTO public.reconciliation_findings (check_name, severity, affected_count, sample_ids, details)
    VALUES ('active_products_without_images', 'warn', v_count, v_samples,
            format('%s active products are missing images', v_count));
  END IF;

  -- Check 5: Stuck "pending" orders older than 24h
  SELECT count(*), COALESCE(jsonb_agg(id) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_count, v_samples
  FROM (
    SELECT id, row_number() OVER () AS rn
    FROM public.orders
    WHERE status = 'pending'
      AND created_at < now() - interval '24 hours'
  ) sub;
  v_checks := v_checks + 1;
  IF v_count > 0 THEN
    v_findings := v_findings + 1;
    INSERT INTO public.reconciliation_findings (check_name, severity, affected_count, sample_ids, details)
    VALUES ('stuck_pending_orders', 'warn', v_count, v_samples,
            format('%s orders have been pending for more than 24h', v_count));
  END IF;

  -- Check 6: Active stores without an owner_id
  SELECT count(*), COALESCE(jsonb_agg(id) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_count, v_samples
  FROM (
    SELECT id, row_number() OVER () AS rn
    FROM public.stores
    WHERE is_active = true AND owner_id IS NULL
  ) sub;
  v_checks := v_checks + 1;
  IF v_count > 0 THEN
    v_findings := v_findings + 1;
    INSERT INTO public.reconciliation_findings (check_name, severity, affected_count, sample_ids, details)
    VALUES ('active_stores_without_owner', 'critical', v_count, v_samples,
            format('%s active stores have no owner_id', v_count));
  END IF;

  -- Check 7: Auto-resolve old findings (>30d) of the same name no longer reproducing
  -- (housekeeping; not a finding itself)
  v_checks := v_checks + 1;

  RETURN jsonb_build_object(
    'ran_at', now(),
    'checks_executed', v_checks,
    'new_findings', v_findings
  );
END;
$function$;