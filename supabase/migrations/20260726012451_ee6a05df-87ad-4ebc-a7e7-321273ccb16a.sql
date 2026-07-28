
-- 1. Kill the auto-approval path that trusted browser-supplied verification_results
DROP TRIGGER IF EXISTS trg_auto_approve_store_application ON public.store_applications;
DROP FUNCTION IF EXISTS public.try_auto_approve_store_application();

-- 2. Schema hardening
ALTER TABLE public.store_applications
  ADD COLUMN IF NOT EXISTS approved_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE public.store_applications
  DROP CONSTRAINT IF EXISTS store_applications_status_check;
ALTER TABLE public.store_applications
  ADD CONSTRAINT store_applications_status_check
  CHECK (status IN ('pending','approved','rejected','withdrawn'));

CREATE UNIQUE INDEX IF NOT EXISTS store_applications_one_pending_per_user
  ON public.store_applications(user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS store_applications_status_created_idx
  ON public.store_applications(status, created_at DESC);

-- 3. Lock down direct DML: everything goes through the RPCs below
DROP POLICY IF EXISTS "Users can create applications" ON public.store_applications;
DROP POLICY IF EXISTS "Reviewers can update applications" ON public.store_applications;
DROP POLICY IF EXISTS "Reviewers can delete applications" ON public.store_applications;

REVOKE INSERT, UPDATE, DELETE ON public.store_applications FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.store_applications FROM anon;
GRANT SELECT ON public.store_applications TO authenticated;
GRANT ALL ON public.store_applications TO service_role;

-- 4. Applicant submit RPC — forces pending, strips reviewer fields
CREATE OR REPLACE FUNCTION public.submit_store_application(
  _store_name text,
  _store_description text,
  _product_category text,
  _discord_server_invite text,
  _age_confirmed boolean,
  _terms_accepted boolean,
  _verification_results jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT _age_confirmed THEN
    RAISE EXCEPTION 'You must confirm your age' USING ERRCODE = '22023';
  END IF;
  IF NOT _terms_accepted THEN
    RAISE EXCEPTION 'You must accept the seller terms' USING ERRCODE = '22023';
  END IF;
  IF _store_name IS NULL OR length(btrim(_store_name)) < 2 THEN
    RAISE EXCEPTION 'Store name is required' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(_store_name)) > 80 THEN
    RAISE EXCEPTION 'Store name is too long' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = v_uid AND status = 'approved' AND (deleted_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'You already have an approved store' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.store_applications
    WHERE user_id = v_uid AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending application' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.store_applications (
    user_id, store_name, store_description, product_category,
    discord_server_invite, age_confirmed, terms_accepted, terms_accepted_at,
    verification_results, status, auto_approved,
    reviewed_by, reviewed_at, rejection_reason, approved_store_id
  ) VALUES (
    v_uid, btrim(_store_name), NULLIF(btrim(_store_description),''), NULLIF(_product_category,''),
    NULLIF(btrim(_discord_server_invite),''), true, true, now(),
    COALESCE(_verification_results,'{}'::jsonb), 'pending', false,
    NULL, NULL, NULL, NULL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_store_application(text,text,text,text,boolean,boolean,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_store_application(text,text,text,text,boolean,boolean,jsonb) TO authenticated;

-- 5. Reviewer decision RPC — permission-checked, row-locked, transactional
CREATE OR REPLACE FUNCTION public.review_store_application(
  _application_id uuid,
  _decision text,
  _rejection_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_app public.store_applications%ROWTYPE;
  v_store_id uuid;
  v_slug text;
  v_base_slug text;
  v_reason text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_permission(v_uid, 'review_store_applications') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF _decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid decision' USING ERRCODE = '22023';
  END IF;

  -- Lock the row to prevent concurrent reviewers
  SELECT * INTO v_app
  FROM public.store_applications
  WHERE id = _application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'Application already reviewed (status: %)', v_app.status USING ERRCODE = '55000';
  END IF;

  IF _decision = 'rejected' THEN
    v_reason := btrim(COALESCE(_rejection_reason,''));
    IF length(v_reason) < 5 THEN
      RAISE EXCEPTION 'A rejection reason of at least 5 characters is required' USING ERRCODE = '22023';
    END IF;
    IF length(v_reason) > 1000 THEN
      RAISE EXCEPTION 'Rejection reason is too long' USING ERRCODE = '22023';
    END IF;

    UPDATE public.store_applications
       SET status = 'rejected',
           rejection_reason = v_reason,
           reviewed_by = v_uid,
           reviewed_at = now(),
           auto_approved = false
     WHERE id = v_app.id;

    INSERT INTO public.audit_logs (user_id, action, resource, details, action_category)
    VALUES (v_uid, 'reject_store_application', v_app.id::text,
            jsonb_build_object('applicant', v_app.user_id, 'reason', v_reason),
            'moderation');

    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (v_app.user_id, 'store_application_rejected',
            'Store application rejected',
            'Your seller application was not approved. Reason: ' || v_reason,
            '/become-seller');

    RETURN jsonb_build_object('status','rejected','application_id', v_app.id);
  END IF;

  -- Approval path: block if applicant already has an approved store
  IF EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = v_app.user_id AND status = 'approved' AND (deleted_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'Applicant already owns an approved store' USING ERRCODE = '23505';
  END IF;

  -- Build a unique slug
  v_base_slug := trim(both '-' from lower(regexp_replace(v_app.store_name, '[^a-zA-Z0-9]+', '-', 'g')));
  IF v_base_slug = '' THEN v_base_slug := 'store'; END IF;
  v_slug := v_base_slug;
  IF EXISTS (SELECT 1 FROM public.stores WHERE slug = v_slug) THEN
    v_slug := v_base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  END IF;

  INSERT INTO public.stores (
    owner_id, name, slug, description, discord_url,
    status, is_active, reviewed_by, reviewed_at
  ) VALUES (
    v_app.user_id, v_app.store_name, v_slug, v_app.store_description,
    v_app.discord_server_invite, 'approved', true, v_uid, now()
  )
  RETURNING id INTO v_store_id;

  INSERT INTO public.seller_balances (user_id, store_id)
  VALUES (v_app.user_id, v_store_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.store_applications
     SET status = 'approved',
         approved_store_id = v_store_id,
         reviewed_by = v_uid,
         reviewed_at = now(),
         auto_approved = false,
         rejection_reason = NULL
   WHERE id = v_app.id;

  INSERT INTO public.audit_logs (user_id, action, resource, details, action_category)
  VALUES (v_uid, 'approve_store_application', v_app.id::text,
          jsonb_build_object('applicant', v_app.user_id, 'store_id', v_store_id, 'slug', v_slug),
          'moderation');

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (v_app.user_id, 'store_application_approved',
          'Store approved',
          'Your seller application was approved. Welcome aboard!',
          '/seller');

  RETURN jsonb_build_object('status','approved','application_id', v_app.id, 'store_id', v_store_id, 'slug', v_slug);
END;
$$;

REVOKE ALL ON FUNCTION public.review_store_application(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_store_application(uuid,text,text) TO authenticated;
