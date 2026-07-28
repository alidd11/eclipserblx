CREATE OR REPLACE FUNCTION public.store_password_reset_code(
  p_email text, p_code text, p_expires_at timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_email text := lower(btrim(COALESCE(p_email, '')));
BEGIN
  IF v_email = '' OR p_code !~ '^[0-9]{6}$'
    OR p_expires_at <= now() OR p_expires_at > now() + interval '30 minutes' THEN
    RAISE EXCEPTION 'Invalid password reset request' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));
  IF EXISTS (
    SELECT 1 FROM public.password_reset_codes
    WHERE email = v_email AND created_at > now() - interval '60 seconds'
  ) THEN
    RAISE EXCEPTION 'Password reset requested too recently' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.password_reset_codes SET used = true WHERE email = v_email AND used = false;
  INSERT INTO public.password_reset_codes (email, code_hash, expires_at, attempts, used)
  VALUES (v_email, extensions.crypt(p_code, extensions.gen_salt('bf')), p_expires_at, 0, false);
END; $function$;

CREATE OR REPLACE FUNCTION public.consume_password_reset_code(
  p_email text, p_code text, p_max_attempts integer DEFAULT 5
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_code public.password_reset_codes%ROWTYPE;
  v_next_attempt integer;
BEGIN
  IF v_email = '' OR p_code !~ '^[0-9]{6}$'
    OR p_max_attempts < 1 OR p_max_attempts > 20 THEN
    RETURN 'invalid';
  END IF;
  SELECT * INTO v_code FROM public.password_reset_codes
    WHERE email = v_email AND used = false
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN 'no_active'; END IF;
  IF v_code.expires_at <= now() THEN
    UPDATE public.password_reset_codes SET used = true WHERE id = v_code.id;
    RETURN 'expired';
  END IF;
  IF COALESCE(v_code.attempts, 0) >= p_max_attempts THEN
    UPDATE public.password_reset_codes SET used = true WHERE id = v_code.id;
    RETURN 'too_many';
  END IF;
  v_next_attempt := COALESCE(v_code.attempts, 0) + 1;
  IF extensions.crypt(p_code, v_code.code_hash) = v_code.code_hash THEN
    UPDATE public.password_reset_codes
    SET used = true, attempts = v_next_attempt WHERE id = v_code.id;
    RETURN 'verified';
  END IF;
  UPDATE public.password_reset_codes
  SET attempts = v_next_attempt, used = v_next_attempt >= p_max_attempts
  WHERE id = v_code.id;
  IF v_next_attempt >= p_max_attempts THEN RETURN 'too_many'; END IF;
  RETURN 'invalid';
END; $function$;

REVOKE ALL ON FUNCTION public.store_password_reset_code(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_password_reset_code(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_reset_code_attempts(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_reset_code_attempts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.burn_reset_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_password_reset_code(text, text, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.store_password_reset_code(text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_code(text, text, integer) TO service_role;

INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20260728122506', 'harden_password_reset_atomicity', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;