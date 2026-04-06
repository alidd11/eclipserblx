CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic text := regexp_replace(COALESCE(_topic, ''), '^realtime:', '');
  v_uid uuid := auth.uid();
  v_resource_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- User-scoped notification channel (unique per user)
  IF v_topic = format('notifications-unified-%s', v_uid::text) THEN
    RETURN true;
  END IF;

  -- Generic app-wide channels any authenticated user can join
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

  -- Ticket messages — verify user owns ticket or is staff
  IF v_topic LIKE 'ticket-messages-%' THEN
    BEGIN
      v_resource_id := substring(v_topic from 'ticket-messages-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = v_resource_id AND (user_id = v_uid OR public.is_staff(v_uid))
    );
  END IF;

  -- Chat messages / chat panel — verify user owns conversation or is staff
  IF v_topic LIKE 'chat_messages_%' OR v_topic LIKE 'chat_panel_%' THEN
    BEGIN
      v_resource_id := substring(v_topic from '(?:chat_messages_|chat_panel_)(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = v_resource_id AND (user_id = v_uid OR assigned_to = v_uid OR public.is_staff(v_uid))
    );
  END IF;

  -- Typing channels — same conversation ownership check
  IF v_topic LIKE 'typing-%' THEN
    BEGIN
      v_resource_id := substring(v_topic from 'typing-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = v_resource_id AND (user_id = v_uid OR assigned_to = v_uid OR public.is_staff(v_uid))
    );
  END IF;

  -- Seller orders — verify user owns the store
  IF v_topic LIKE 'seller-orders-%' THEN
    BEGIN
      v_resource_id := substring(v_topic from 'seller-orders-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.stores WHERE id = v_resource_id AND owner_id = v_uid
    );
  END IF;

  -- Thread messages — verify user is staff (admin chat threads)
  IF v_topic LIKE 'thread-%' THEN
    RETURN public.is_staff(v_uid);
  END IF;

  -- Staff-only channels
  IF public.is_staff(v_uid) AND (
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

-- Fix guest order item injection
CREATE OR REPLACE FUNCTION public.user_can_insert_order_item(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id AND user_id = _user_id
  )
$$;