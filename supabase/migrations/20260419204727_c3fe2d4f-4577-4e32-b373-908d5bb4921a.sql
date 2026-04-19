-- 1. Roadmap status overrides
CREATE TABLE IF NOT EXISTS public.platform_roadmap_status (
  task_key text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('todo','in_progress','done','blocked')),
  note text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_roadmap_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roadmap status"
  ON public.platform_roadmap_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roadmap status"
  ON public.platform_roadmap_status FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roadmap status"
  ON public.platform_roadmap_status FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roadmap status"
  ON public.platform_roadmap_status FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Synthetic E2E probe runs
CREATE TABLE IF NOT EXISTS public.synthetic_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_name text NOT NULL,
  success boolean NOT NULL,
  total_latency_ms integer NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  failed_step text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synthetic_runs_created ON public.synthetic_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synthetic_runs_probe ON public.synthetic_runs (probe_name, created_at DESC);

ALTER TABLE public.synthetic_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view synthetic runs"
  ON public.synthetic_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Reconciliation findings
CREATE TABLE IF NOT EXISTS public.reconciliation_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warn','critical')),
  affected_count integer NOT NULL DEFAULT 0,
  sample_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  details text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_open
  ON public.reconciliation_findings (resolved, created_at DESC)
  WHERE resolved = false;

ALTER TABLE public.reconciliation_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view findings"
  ON public.reconciliation_findings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins resolve findings"
  ON public.reconciliation_findings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Helper RPCs
CREATE OR REPLACE FUNCTION public.get_synthetic_health(_hours integer DEFAULT 24)
RETURNS TABLE (
  probe_name text, total_runs bigint, successful_runs bigint,
  success_rate numeric, avg_latency_ms numeric, p95_latency_ms numeric,
  last_run_at timestamptz, last_run_success boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    probe_name,
    count(*)::bigint,
    count(*) FILTER (WHERE success)::bigint,
    ROUND(100.0 * count(*) FILTER (WHERE success) / NULLIF(count(*), 0), 2),
    ROUND(avg(total_latency_ms)::numeric, 0),
    ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY total_latency_ms)::numeric, 0),
    max(created_at),
    (array_agg(success ORDER BY created_at DESC))[1]
  FROM public.synthetic_runs
  WHERE created_at > now() - make_interval(hours => _hours)
  GROUP BY probe_name
  ORDER BY probe_name;
$$;

CREATE OR REPLACE FUNCTION public.get_open_findings_summary()
RETURNS TABLE (severity text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT severity, count(*)::bigint
  FROM public.reconciliation_findings
  WHERE resolved = false
  GROUP BY severity;
$$;

-- 5. Eclipse-tailored nightly reconciliation routine
CREATE OR REPLACE FUNCTION public.run_nightly_reconciliation()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count int;
  v_samples jsonb;
  v_checks int := 0;
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
    INSERT INTO public.reconciliation_findings (check_name, severity, affected_count, sample_ids, details)
    VALUES ('public_tables_without_rls', 'critical', v_count, v_samples,
            format('%s public tables have RLS disabled', v_count));
  END IF;

  -- Check 4: Active products with no images
  SELECT count(*), COALESCE(jsonb_agg(id) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_count, v_samples
  FROM (
    SELECT p.id, row_number() OVER () AS rn
    FROM public.products p
    WHERE p.is_active = true
      AND (p.images IS NULL OR jsonb_array_length(p.images) = 0)
  ) sub;
  v_checks := v_checks + 1;
  IF v_count > 0 THEN
    INSERT INTO public.reconciliation_findings (check_name, severity, affected_count, sample_ids, details)
    VALUES ('active_products_without_images', 'warn', v_count, v_samples,
            format('%s active products are missing images', v_count));
  END IF;

  RETURN jsonb_build_object('ran_at', now(), 'checks_executed', v_checks);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_synthetic_health(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_open_findings_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_nightly_reconciliation() TO service_role;