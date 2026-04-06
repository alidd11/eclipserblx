CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic text := regexp_replace(COALESCE(_topic, ''), '^realtime:', '');
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF v_topic = format('notifications-unified-%s', auth.uid()::text) THEN
    RETURN true;
  END IF;

  IF v_topic IN (
    'messages-page-notifications',
    'seller-unread-bell',
    'seller-notifications-realtime',
    'seller-messages-realtime',
    'seller-support-realtime',
    'customer-message-replies',
    'store-messages-realtime',
    'chat_unread_counter'
  ) THEN
    RETURN true;
  END IF;

  IF v_topic LIKE 'ticket-messages-%'
     OR v_topic LIKE 'thread-%'
     OR v_topic LIKE 'typing-%'
     OR v_topic LIKE 'chat_messages_%'
     OR v_topic LIKE 'chat_panel_%'
     OR v_topic LIKE 'seller-orders-%'
  THEN
    RETURN true;
  END IF;

  IF public.is_staff(auth.uid()) AND (
    v_topic IN (
      'support-ticket-notifications',
      'seller-ticket-notifications',
      'customer-tickets-realtime',
      'bot-requests-realtime',
      'seller-tickets-realtime',
      'admin-conversations',
      'staff-chat-presence',
      'staff-admin-chat-notifications',
      'staff-activity-realtime'
    )
    OR v_topic LIKE 'admin-ticket-messages-%'
    OR v_topic LIKE 'admin-chat-%'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_realtime_topic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(text) TO authenticated;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can access approved realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated users can access approved realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_access_realtime_topic(realtime.topic()));

DROP POLICY IF EXISTS "Authenticated users can publish approved realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated users can publish approved realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_realtime_topic(topic));

CREATE OR REPLACE FUNCTION public.get_push_subscription_total()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT COUNT(*)::integer
    FROM public.push_subscriptions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_push_subscription_total() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_push_subscription_total() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_push_subscribed_staff_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ps.user_id
  FROM public.push_subscriptions ps
  WHERE public.is_staff(ps.user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.list_push_subscribed_staff_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_push_subscribed_staff_user_ids() TO authenticated;

DROP POLICY IF EXISTS "Staff can view all push subscriptions" ON public.push_subscriptions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'push_subscriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.push_subscriptions';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_discount_code_for_checkout(
  p_code text,
  p_product_ids uuid[] DEFAULT NULL,
  p_subtotal numeric DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  min_order_amount numeric,
  max_uses integer,
  current_uses integer,
  expires_at timestamp with time zone,
  store_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.code,
    d.discount_type,
    d.discount_value,
    d.min_order_amount,
    d.max_uses,
    d.current_uses,
    d.expires_at,
    d.store_id
  FROM public.discount_codes d
  WHERE upper(d.code) = upper(trim(p_code))
    AND d.is_active = true
    AND (d.expires_at IS NULL OR d.expires_at >= now())
    AND (d.max_uses IS NULL OR COALESCE(d.current_uses, 0) < d.max_uses)
    AND COALESCE(d.min_order_amount, 0) <= COALESCE(p_subtotal, 0)
    AND (d.restricted_to_user_id IS NULL OR d.restricted_to_user_id = auth.uid())
    AND (
      d.store_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.products p
        WHERE p.id = ANY(COALESCE(p_product_ids, ARRAY[]::uuid[]))
          AND p.store_id = d.store_id
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_discount_code_for_checkout(text, uuid[], numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_discount_code_for_checkout(text, uuid[], numeric) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view active non-restricted discount codes" ON public.discount_codes;