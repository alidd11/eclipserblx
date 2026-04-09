
-- 1) Products storefront view
CREATE VIEW public.products_storefront AS
SELECT
  id, name, slug, description, price, category_id, images,
  is_featured, is_active, download_count, created_at, updated_at,
  release_at, robux_enabled, robux_price, store_id, seller_price,
  moderation_status, is_seller_product, is_resellable, deleted_at,
  eclipse_free_eligible, early_access_hours, delivery_type,
  external_link, is_pay_what_you_want, min_price, product_number,
  additional_asset_files, max_downloads_per_purchase,
  early_access_strategy, early_access_min_orders
FROM public.products
WHERE is_active = true AND deleted_at IS NULL;

ALTER VIEW public.products_storefront SET (security_invoker = off);
GRANT SELECT ON public.products_storefront TO anon, authenticated;

-- 2) Fix trivia safe view (drop wrong_answers too)
DROP VIEW IF EXISTS public.discord_trivia_questions_safe;
CREATE VIEW public.discord_trivia_questions_safe AS
SELECT id, question, category, difficulty, created_at
FROM public.discord_trivia_questions;

ALTER VIEW public.discord_trivia_questions_safe SET (security_invoker = on);
GRANT SELECT ON public.discord_trivia_questions_safe TO authenticated;

-- 3) Scope realtime channels per-user
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic text := regexp_replace(COALESCE(_topic, ''), '^realtime:', '');
  v_uid uuid := auth.uid();
  v_resource_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  IF v_topic = format('notifications-unified-%s', v_uid::text) THEN RETURN true; END IF;

  IF v_topic = format('messages-page-notifications-%s', v_uid::text)
     OR v_topic = format('customer-message-replies-%s', v_uid::text)
     OR v_topic = format('chat_unread_counter-%s', v_uid::text) THEN
    RETURN true;
  END IF;

  IF v_topic IN (
    'seller-unread-bell','seller-notifications-realtime','seller-messages-realtime',
    'seller-support-realtime','store-messages-realtime'
  ) THEN
    RETURN EXISTS (SELECT 1 FROM stores WHERE owner_id = v_uid AND status = 'approved');
  END IF;

  IF v_topic LIKE 'ticket-messages-%' THEN
    BEGIN v_resource_id := substring(v_topic from 'ticket-messages-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false; END;
    RETURN EXISTS (SELECT 1 FROM support_tickets WHERE id = v_resource_id AND (user_id = v_uid OR is_staff(v_uid)));
  END IF;

  IF v_topic LIKE 'chat_messages_%' OR v_topic LIKE 'chat_panel_%' THEN
    BEGIN v_resource_id := substring(v_topic from '(?:chat_messages_|chat_panel_)(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false; END;
    RETURN EXISTS (SELECT 1 FROM chat_conversations WHERE id = v_resource_id AND (user_id = v_uid OR assigned_to = v_uid OR is_staff(v_uid)));
  END IF;

  IF v_topic LIKE 'typing-%' THEN
    BEGIN v_resource_id := substring(v_topic from 'typing-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false; END;
    RETURN EXISTS (SELECT 1 FROM chat_conversations WHERE id = v_resource_id AND (user_id = v_uid OR assigned_to = v_uid OR is_staff(v_uid)));
  END IF;

  IF v_topic LIKE 'seller-orders-%' THEN
    BEGIN v_resource_id := substring(v_topic from 'seller-orders-(.+)')::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false; END;
    RETURN EXISTS (SELECT 1 FROM stores WHERE id = v_resource_id AND owner_id = v_uid);
  END IF;

  IF v_topic LIKE 'thread-%' THEN RETURN is_staff(v_uid); END IF;

  IF is_staff(v_uid) AND (
    v_topic IN (
      'support-ticket-notifications','seller-ticket-notifications','customer-tickets-realtime',
      'bot-requests-realtime','seller-tickets-realtime','admin-conversations',
      'staff-chat-presence','staff-admin-chat-notifications','staff-activity-realtime'
    )
    OR v_topic LIKE 'admin-ticket-messages-%'
    OR v_topic LIKE 'admin-chat-%'
  ) THEN RETURN true; END IF;

  RETURN false;
END;
$$;
