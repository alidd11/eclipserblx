-- Store applications must always be reviewed by an authorised administrator.
-- This migration removes the legacy auto-approval path and makes the review,
-- store activation, notification and audit record one
-- atomic database operation.

DROP TRIGGER IF EXISTS trg_auto_approve_store_application ON public.store_applications;
DROP FUNCTION IF EXISTS public.try_auto_approve_store_application();

ALTER TABLE public.store_applications
  DROP CONSTRAINT IF EXISTS unique_pending_application;

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_applications_one_pending_per_user
  ON public.store_applications(user_id)
  WHERE status = 'pending';

ALTER TABLE public.store_applications
  ADD COLUMN IF NOT EXISTS approved_store_id uuid REFERENCES public.stores(id);

DROP POLICY IF EXISTS "Users can create applications" ON public.store_applications;
CREATE POLICY "Users can create pending applications"
  ON public.store_applications FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND char_length(btrim(store_name)) BETWEEN 2 AND 80
    AND age_confirmed = true
    AND terms_accepted = true
    AND terms_accepted_at IS NOT NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND rejection_reason IS NULL
    AND COALESCE(auto_approved, false) = false
    AND approved_store_id IS NULL
  );

DROP POLICY IF EXISTS "Staff can view all applications" ON public.store_applications;
CREATE POLICY "Application reviewers can view applications"
  ON public.store_applications FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'view_store_applications')
    OR public.has_permission(auth.uid(), 'review_store_applications')
  );

DROP POLICY IF EXISTS "Staff can manage applications" ON public.store_applications;
DROP POLICY IF EXISTS "Reviewers can update applications" ON public.store_applications;
DROP POLICY IF EXISTS "Reviewers can delete applications" ON public.store_applications;

DROP POLICY IF EXISTS "Authenticated users can create stores" ON public.stores;
DROP POLICY IF EXISTS "Applicants can create pending stores" ON public.stores;

DROP FUNCTION IF EXISTS public.review_store_application(uuid, text, text);

CREATE OR REPLACE FUNCTION public.review_store_application(
  p_application_id uuid,
  p_decision text,
  p_rejection_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_reviewer_id uuid := auth.uid();
  v_application public.store_applications%ROWTYPE;
  v_store public.stores%ROWTYPE;
  v_slug text;
  v_suffix integer := 1;
  v_reason text := NULLIF(btrim(COALESCE(p_rejection_reason, '')), '');
BEGIN
  IF v_reviewer_id IS NULL
     OR NOT public.has_permission(v_reviewer_id, 'review_store_applications') THEN
    RAISE EXCEPTION 'Not authorised to review store applications'
      USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected'
      USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'rejected' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'A rejection reason is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_application
  FROM public.store_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store application not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_application.status <> 'pending' THEN
    IF v_application.status = p_decision THEN
      RETURN jsonb_build_object(
        'application_id', v_application.id,
        'status', v_application.status,
        'store_id', v_application.approved_store_id,
        'already_reviewed', true
      );
    END IF;

    RAISE EXCEPTION 'This application has already been reviewed'
      USING ERRCODE = '55000';
  END IF;

  IF p_decision = 'approved' THEN
    IF NOT v_application.age_confirmed
       OR NOT v_application.terms_accepted
       OR v_application.terms_accepted_at IS NULL THEN
      RAISE EXCEPTION 'The applicant must confirm their age and accept the seller terms before approval'
        USING ERRCODE = '23514';
    END IF;

    SELECT *
    INTO v_store
    FROM public.stores
    WHERE owner_id = v_application.user_id
      AND deleted_at IS NULL
    ORDER BY
      CASE status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
      created_at
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_store.status = 'suspended' THEN
      RAISE EXCEPTION 'This applicant already has a suspended store; review that store before approving a new application'
        USING ERRCODE = '55000';
    END IF;

    IF NOT FOUND THEN
      v_slug := lower(regexp_replace(v_application.store_name, '[^a-zA-Z0-9]+', '-', 'g'));
      v_slug := trim(both '-' from v_slug);
      IF v_slug = '' THEN
        v_slug := 'store';
      END IF;

      WHILE EXISTS (SELECT 1 FROM public.stores WHERE slug = v_slug) LOOP
        v_suffix := v_suffix + 1;
        v_slug := left(
          lower(regexp_replace(v_application.store_name, '[^a-zA-Z0-9]+', '-', 'g')),
          70
        ) || '-' || v_suffix::text;
      END LOOP;

      INSERT INTO public.stores (
        owner_id, name, slug, description, discord_url, status,
        is_active, is_verified, reviewed_by, reviewed_at
      )
      VALUES (
        v_application.user_id, v_application.store_name, v_slug,
        v_application.store_description, v_application.discord_server_invite,
        'approved', true, false, v_reviewer_id, now()
      )
      RETURNING * INTO v_store;
    ELSE
      UPDATE public.stores
      SET status = 'approved', is_active = true,
          reviewed_by = v_reviewer_id, reviewed_at = now(),
          rejection_reason = NULL
      WHERE id = v_store.id
      RETURNING * INTO v_store;
    END IF;

    INSERT INTO public.seller_balances (user_id, store_id)
    VALUES (v_application.user_id, v_store.id)
    ON CONFLICT (user_id) DO UPDATE SET store_id = EXCLUDED.store_id;

    UPDATE public.profiles
    SET accounts_locked = true, accounts_locked_at = COALESCE(accounts_locked_at, now())
    WHERE user_id = v_application.user_id;

    UPDATE public.store_applications
    SET status = 'approved', auto_approved = false,
        reviewed_by = v_reviewer_id, reviewed_at = now(),
        rejection_reason = NULL,
        notes = COALESCE(NULLIF(btrim(COALESCE(p_notes, '')), ''), notes),
        approved_store_id = v_store.id
    WHERE id = v_application.id;

    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      v_application.user_id, 'application_approved',
      'Your store application was approved',
      format('Your application for %s has been approved. You can now set up your store.', v_application.store_name),
      '/seller/setup'
    );

    INSERT INTO public.audit_logs (user_id, action, resource, action_category, details)
    VALUES (
      v_reviewer_id, 'store_application_approved', 'store_applications', 'marketplace',
      jsonb_build_object(
        'application_id', v_application.id,
        'applicant_id', v_application.user_id,
        'store_id', v_store.id,
        'store_name', v_application.store_name
      )
    );

    RETURN jsonb_build_object(
      'application_id', v_application.id,
      'status', 'approved',
      'store_id', v_store.id,
      'already_reviewed', false
    );
  END IF;

  UPDATE public.store_applications
  SET status = 'rejected', auto_approved = false,
      reviewed_by = v_reviewer_id, reviewed_at = now(),
      rejection_reason = v_reason,
      notes = COALESCE(NULLIF(btrim(COALESCE(p_notes, '')), ''), notes),
      approved_store_id = NULL
  WHERE id = v_application.id;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_application.user_id, 'application_rejected', 'Store application update',
    format('Your application for %s was not approved. Reason: %s', v_application.store_name, v_reason),
    '/become-seller'
  );

  INSERT INTO public.audit_logs (user_id, action, resource, action_category, details)
  VALUES (
    v_reviewer_id, 'store_application_rejected', 'store_applications', 'marketplace',
    jsonb_build_object(
      'application_id', v_application.id,
      'applicant_id', v_application.user_id,
      'store_name', v_application.store_name,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'application_id', v_application.id,
    'status', 'rejected',
    'store_id', NULL,
    'already_reviewed', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.review_store_application(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_store_application(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_store_application(uuid, text, text, text) TO authenticated;

INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20260726020000', 'secure_store_application_review', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;