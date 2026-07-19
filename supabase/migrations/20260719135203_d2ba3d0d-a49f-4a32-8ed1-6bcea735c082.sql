-- 1. Fix admin_overview_snapshot: outer ORDER BY references alias `d`
CREATE OR REPLACE FUNCTION public.admin_overview_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_today_start timestamptz := date_trunc('day', now());
  v_yday_start timestamptz := date_trunc('day', now()) - interval '1 day';
  v_week_start timestamptz := date_trunc('day', now()) - interval '7 days';
  v_active_orders int;
  v_open_tickets int;
  v_today_orders int;
  v_staff_on_duty int;
  v_revenue_today numeric;
  v_revenue_yesterday numeric;
  v_pending_refunds int;
  v_products_awaiting_review int;
  v_open_incidents int;
  v_refunded_7d int;
  v_paid_7d int;
  v_revenue_14d jsonb;
BEGIN
  IF v_uid IS NULL OR NOT public.is_staff(v_uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_active_orders
    FROM public.orders WHERE status IN ('pending','processing') AND deleted_at IS NULL;

  SELECT count(*) INTO v_open_tickets
    FROM public.support_tickets WHERE status IN ('open','in_progress');

  SELECT count(*), COALESCE(sum(total),0) INTO v_today_orders, v_revenue_today
    FROM public.orders WHERE created_at >= v_today_start AND status IN ('paid','fulfilled') AND deleted_at IS NULL;

  SELECT COALESCE(sum(total),0) INTO v_revenue_yesterday
    FROM public.orders
    WHERE created_at >= v_yday_start AND created_at < v_today_start
      AND status IN ('paid','fulfilled') AND deleted_at IS NULL;

  SELECT count(*) INTO v_staff_on_duty
    FROM public.staff_duty_logs WHERE clock_out IS NULL;

  SELECT count(*) INTO v_pending_refunds
    FROM public.refund_requests WHERE status IN ('pending','escalated');

  SELECT count(*) INTO v_products_awaiting_review
    FROM public.products WHERE moderation_status = 'pending' AND deleted_at IS NULL;

  SELECT count(*) INTO v_open_incidents
    FROM public.incidents WHERE resolved_at IS NULL;

  SELECT count(*) FILTER (WHERE status = 'refunded'),
         count(*) FILTER (WHERE status IN ('paid','fulfilled','refunded'))
    INTO v_refunded_7d, v_paid_7d
    FROM public.orders
    WHERE created_at >= v_week_start AND deleted_at IS NULL;

  SELECT COALESCE(jsonb_agg(row ORDER BY d), '[]'::jsonb) INTO v_revenue_14d
  FROM (
    SELECT jsonb_build_object(
      'day', d::date,
      'revenue', COALESCE(sum(o.total) FILTER (WHERE o.status IN ('paid','fulfilled') AND o.deleted_at IS NULL), 0)
    ) AS row,
    d
    FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
    LEFT JOIN public.orders o
      ON o.created_at >= d AND o.created_at < d + interval '1 day'
    GROUP BY d
  ) s;

  RETURN jsonb_build_object(
    'active_orders', v_active_orders,
    'open_tickets', v_open_tickets,
    'today_orders', v_today_orders,
    'staff_on_duty', v_staff_on_duty,
    'revenue_today', v_revenue_today,
    'revenue_yesterday', v_revenue_yesterday,
    'pending_refunds', v_pending_refunds,
    'products_awaiting_review', v_products_awaiting_review,
    'open_incidents', v_open_incidents,
    'refund_rate_7d', CASE WHEN v_paid_7d > 0 THEN round((v_refunded_7d::numeric / v_paid_7d) * 100, 1) ELSE 0 END,
    'revenue_14d', v_revenue_14d,
    'generated_at', now()
  );
END;
$function$;

-- 2. Grant SELECT on safe view
GRANT SELECT ON public.store_payment_details_safe TO authenticated;

-- 3. store_team_invites: grants + rebind policies to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_team_invites TO authenticated;

DROP POLICY IF EXISTS "Store owners can create invites" ON public.store_team_invites;
DROP POLICY IF EXISTS "Store owners can delete invites" ON public.store_team_invites;
DROP POLICY IF EXISTS "Store owners can view invites" ON public.store_team_invites;

CREATE POLICY "Store owners can create invites"
  ON public.store_team_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (is_store_owner(store_id, auth.uid()));

CREATE POLICY "Store owners can delete invites"
  ON public.store_team_invites
  FOR DELETE
  TO authenticated
  USING (is_store_owner(store_id, auth.uid()));

CREATE POLICY "Store owners can view invites"
  ON public.store_team_invites
  FOR SELECT
  TO authenticated
  USING (is_store_owner(store_id, auth.uid()));