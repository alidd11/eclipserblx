
-- Fix storage: seller product image update/delete policies reference stores.name instead of objects.name
DROP POLICY IF EXISTS "Sellers can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete own product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload own product images" ON storage.objects;

CREATE POLICY "Sellers can upload own product images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM stores
    WHERE stores.owner_id = auth.uid()
      AND (stores.id)::text = split_part(objects.name, '/', 1)
  )
);

CREATE POLICY "Sellers can update own product images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM stores
    WHERE stores.owner_id = auth.uid()
      AND (stores.id)::text = split_part(objects.name, '/', 1)
  )
);

CREATE POLICY "Sellers can delete own product images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM stores
    WHERE stores.owner_id = auth.uid()
      AND (stores.id)::text = split_part(objects.name, '/', 1)
  )
);

-- Fix dispute evidence viewing policy
DROP POLICY IF EXISTS "Sellers can view dispute evidence for their store" ON storage.objects;
CREATE POLICY "Sellers can view dispute evidence for their store" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND EXISTS (
    SELECT 1
    FROM dispute_evidence de
    JOIN refund_requests r ON r.id = de.dispute_id
    JOIN stores s ON s.id = r.store_id
    WHERE de.file_path = objects.name
      AND s.owner_id = auth.uid()
  )
);

-- Scope realtime channels: replace generic seller channels with user-scoped checks
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

  -- Seller channels: require the user to actually own a store
  IF v_topic IN (
    'seller-unread-bell',
    'seller-notifications-realtime',
    'seller-messages-realtime',
    'seller-support-realtime',
    'store-messages-realtime'
  ) THEN
    RETURN EXISTS (SELECT 1 FROM stores WHERE owner_id = v_uid AND status = 'approved');
  END IF;

  -- Generic authenticated channels
  IF v_topic IN (
    'messages-page-notifications',
    'customer-message-replies',
    'chat_unread_counter'
  ) THEN
    RETURN true;
  END IF;

  -- Ticket messages
  IF v_topic LIKE 'ticket-messages-%' THEN
    BEGIN
      v_resource_id := substring(v_topic from 'ticket-messages-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = v_resource_id AND (user_id = v_uid OR is_staff(v_uid))
    );
  END IF;

  -- Chat messages / chat panel
  IF v_topic LIKE 'chat_messages_%' OR v_topic LIKE 'chat_panel_%' THEN
    BEGIN
      v_resource_id := substring(v_topic from '(?:chat_messages_|chat_panel_)(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE id = v_resource_id AND (user_id = v_uid OR assigned_to = v_uid OR is_staff(v_uid))
    );
  END IF;

  -- Typing channels
  IF v_topic LIKE 'typing-%' THEN
    BEGIN
      v_resource_id := substring(v_topic from 'typing-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE id = v_resource_id AND (user_id = v_uid OR assigned_to = v_uid OR is_staff(v_uid))
    );
  END IF;

  -- Seller orders
  IF v_topic LIKE 'seller-orders-%' THEN
    BEGIN
      v_resource_id := substring(v_topic from 'seller-orders-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM stores WHERE id = v_resource_id AND owner_id = v_uid
    );
  END IF;

  -- Thread messages (admin chat)
  IF v_topic LIKE 'thread-%' THEN
    RETURN is_staff(v_uid);
  END IF;

  -- Staff-only channels
  IF is_staff(v_uid) AND (
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
