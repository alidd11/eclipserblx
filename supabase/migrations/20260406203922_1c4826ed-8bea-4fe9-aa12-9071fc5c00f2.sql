
-- Store a new password reset code (hashed)
CREATE OR REPLACE FUNCTION public.store_password_reset_code(
  p_email text,
  p_code text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Invalidate existing codes
  UPDATE public.password_reset_codes SET used = true
  WHERE email = p_email AND used = false;
  
  -- Insert new hashed code
  INSERT INTO public.password_reset_codes (email, code_hash, expires_at)
  VALUES (p_email, crypt(p_code, gen_salt('bf')), p_expires_at);
END;
$$;

-- Verify a password reset code against the hash
CREATE OR REPLACE FUNCTION public.verify_password_reset_code(
  p_email text,
  p_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.password_reset_codes
  WHERE email = p_email
    AND used = false
    AND expires_at > now()
    AND crypt(p_code, code_hash) = code_hash
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_id;
END;
$$;

-- Get recent unused code for attempt tracking
CREATE OR REPLACE FUNCTION public.get_reset_code_attempts(p_email text)
RETURNS TABLE(id uuid, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT prc.id, prc.attempts
  FROM public.password_reset_codes prc
  WHERE prc.email = p_email
    AND prc.used = false
    AND prc.expires_at > now()
  ORDER BY prc.created_at DESC
  LIMIT 1;
END;
$$;

-- Increment attempts
CREATE OR REPLACE FUNCTION public.increment_reset_code_attempts(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.password_reset_codes SET attempts = attempts + 1 WHERE id = p_id;
END;
$$;

-- Burn a reset code
CREATE OR REPLACE FUNCTION public.burn_reset_code(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.password_reset_codes SET used = true WHERE id = p_id;
END;
$$;
