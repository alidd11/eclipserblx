
-- Security-definer function to validate team invites bypassing RLS
CREATE OR REPLACE FUNCTION public.validate_team_invite(p_token text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
  v_store_name TEXT;
  v_existing_member UUID;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  IF v_user_email IS NULL THEN
    RETURN json_build_object('status', 'error', 'reason', 'user_not_found');
  END IF;

  -- Look up invite by token (bypasses RLS)
  SELECT * INTO v_invite FROM public.store_team_invites WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'not_found');
  END IF;

  -- Check expiry
  IF v_invite.expires_at < now() THEN
    RETURN json_build_object('status', 'expired');
  END IF;

  -- Check email match
  IF lower(v_user_email) != lower(v_invite.email) THEN
    RETURN json_build_object('status', 'wrong_email', 'expected_email', left(v_invite.email, 3) || '***');
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing_member FROM public.store_team_members
    WHERE store_id = v_invite.store_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN json_build_object('status', 'already_member');
  END IF;

  -- Get store name
  SELECT name INTO v_store_name FROM public.stores WHERE id = v_invite.store_id;

  RETURN json_build_object(
    'status', 'valid',
    'invite_id', v_invite.id,
    'store_id', v_invite.store_id,
    'store_name', COALESCE(v_store_name, 'Unknown Store'),
    'role', v_invite.role,
    'invited_by', v_invite.invited_by
  );
END;
$$;
