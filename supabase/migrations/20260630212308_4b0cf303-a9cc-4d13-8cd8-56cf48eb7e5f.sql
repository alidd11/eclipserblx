
-- 1. Performance indexes
CREATE INDEX IF NOT EXISTS idx_products_category_active_release
  ON public.products (category_id, is_active, release_at)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_active_created
  ON public.products (is_active, created_at DESC)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_page_visits_created_at
  ON public.page_visits (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_visits_is_new_visitor
  ON public.page_visits (is_new_visitor)
  WHERE is_new_visitor = true;

CREATE INDEX IF NOT EXISTS idx_staff_activity_user_created
  ON public.staff_activity (user_id, created_at DESC);

-- 2. Analytics snapshot (materialised view, refreshed by cron)
DROP MATERIALIZED VIEW IF EXISTS public.page_visits_daily_summary;
CREATE MATERIALIZED VIEW public.page_visits_daily_summary AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*)                            AS visits,
  count(*) FILTER (WHERE is_new_visitor) AS new_visitors,
  count(DISTINCT page_path)           AS unique_paths
FROM public.page_visits
WHERE created_at >= now() - interval '90 days'
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_visits_daily_summary_day
  ON public.page_visits_daily_summary (day);

GRANT SELECT ON public.page_visits_daily_summary TO authenticated;
GRANT ALL    ON public.page_visits_daily_summary TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_page_visits_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.page_visits_daily_summary;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_page_visits_summary() FROM PUBLIC, anon, authenticated;

-- 3. Harden Orion outbox trigger so a queue failure never blocks the source insert
CREATE OR REPLACE FUNCTION public.orion_enqueue_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_type text;
  payload jsonb;
BEGIN
  BEGIN
    event_type := TG_ARGV[0] || '.' || lower(TG_OP);
    payload := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'op', TG_OP,
      'new', to_jsonb(NEW),
      'old', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
    );
    INSERT INTO public.orion_event_outbox (event_type, payload)
    VALUES (event_type, payload);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'orion_enqueue_event failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.orion_enqueue_event() FROM PUBLIC, anon, authenticated;

-- 4. Auto-findings scan function
CREATE OR REPLACE FUNCTION public.orion_scan_findings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_inserted integer := 0;
  n integer;
BEGIN
  -- Stuck pending orders > 30m
  INSERT INTO public.orion_findings (title, kind, status, raised_by, root_cause, evidence)
  SELECT
    'Order stuck in pending: ' || o.id::text,
    'risk',
    'open',
    'orion-scan',
    'Order has remained in pending status for over 30 minutes.',
    jsonb_build_object('order_id', o.id, 'created_at', o.created_at)
  FROM public.orders o
  WHERE o.status = 'pending'
    AND o.created_at < now() - interval '30 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.orion_findings f
      WHERE f.raised_by = 'orion-scan'
        AND f.evidence->>'order_id' = o.id::text
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  total_inserted := total_inserted + n;

  -- Outbox events with attempts >= 5 and not yet delivered
  INSERT INTO public.orion_findings (title, kind, status, raised_by, root_cause, evidence)
  SELECT
    'Orion outbox event failing: ' || e.event_type,
    'bug',
    'open',
    'orion-scan',
    'Event has retried ' || e.attempts || ' times without delivery.',
    jsonb_build_object('outbox_id', e.id, 'event_type', e.event_type, 'last_error', e.last_error)
  FROM public.orion_event_outbox e
  WHERE e.attempts >= 5
    AND e.delivered_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.orion_findings f
      WHERE f.raised_by = 'orion-scan'
        AND f.evidence->>'outbox_id' = e.id::text
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  total_inserted := total_inserted + n;

  RETURN total_inserted;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.orion_scan_findings() FROM PUBLIC, anon, authenticated;
