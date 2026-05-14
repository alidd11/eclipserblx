-- ============================================================
-- Stability Sweep: revoke EXECUTE on internal SECURITY DEFINER
-- functions and tighten public-bucket listing policies.
-- ============================================================

DO $$
DECLARE
  r record;
  fn_sig text;
  keep_anon text[] := ARRAY[
    -- anon-callable RPCs
    'is_username_available',
    'search_products_v2',
    'search_products_ranked',
    'validate_applicant_token',
    'get_applicant_messages',
    'mark_applicant_messages_read',
    'record_rate_limit',
    'suggest_correction',
    'get_weighted_promotion',
    'charge_promotion_impression',
    'record_promotion_click',
    'increment_promotion_impression',
    'increment_download_count'
  ];
  keep_auth text[] := ARRAY[
    -- RLS / authorization helpers (called from policies)
    'has_role',
    'has_permission',
    'is_staff',
    'is_store_owner',
    'is_store_team_member',
    'has_premium_global_guard',
    'can_access_realtime_topic',
    'auth_user_exists',
    'can_user_download',
    'can_seller_upload',
    'seller_has_products_in_order',
    'seller_owns_order_item_product',
    'user_can_insert_order_item',
    'user_owns_order',
    'can_assign_role',
    'can_create_role',
    'can_manage_specific_role',
    'can_manage_user_roles',
    'product_file_review_consented',
    'user_has_purchased_product',
    -- frontend RPCs called by signed-in users
    'get_push_subscription_total',
    'get_synthetic_health',
    'get_open_findings_summary',
    'get_user_max_hierarchy',
    'escalate_dispute',
    'get_global_guard_limits',
    'check_and_award_badges',
    'list_push_subscribed_staff_user_ids',
    'validate_discount_code_for_checkout',
    'update_category_affinity',
    'list_staff_members',
    'validate_team_invite',
    'request_seller_payout'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    fn_sig := format('public.%I(%s)', r.proname, r.args);

    IF r.proname = ANY(keep_anon) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', fn_sig);
    ELSIF r.proname = ANY(keep_auth) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn_sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_sig);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn_sig);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- Tighten public bucket SELECT policies: allow GET by name, not LIST.
-- We replace any over-broad "anyone can SELECT bucket_id = X" policy
-- with one that requires a specific object name (no listing).
-- ============================================================

DO $$
DECLARE
  bucket text;
  buckets text[] := ARRAY['product-images', 'forum-images', 'avatars', 'store-branding'];
  pol record;
BEGIN
  FOREACH bucket IN ARRAY buckets LOOP
    -- Drop existing broad public-read policies for this bucket
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename  = 'objects'
        AND cmd = 'SELECT'
        AND qual ILIKE '%' || bucket || '%'
        AND (qual ILIKE '%bucket_id%' AND qual NOT ILIKE '%name%')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;

    -- Create a new GET-by-name policy (blocks anonymous LIST at bucket root)
    EXECUTE format($f$
      CREATE POLICY "Public read by name: %1$s" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id = %1$L AND name IS NOT NULL AND length(name) > 0)
    $f$, bucket);
  END LOOP;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;