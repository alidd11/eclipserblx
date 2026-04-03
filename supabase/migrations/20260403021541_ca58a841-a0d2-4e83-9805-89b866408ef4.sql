
CREATE OR REPLACE FUNCTION public.try_auto_approve_store_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_verification jsonb;
  v_identity_score numeric;
  v_discord_valid boolean;
  v_discord_permanent boolean;
  v_email_verified boolean;
  v_slug text;
  v_store RECORD;
  v_existing_store RECORD;
BEGIN
  IF TG_OP != 'INSERT' OR NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  v_verification := NEW.verification_results;
  
  IF v_verification IS NULL THEN
    RETURN NEW;
  END IF;

  v_identity_score := COALESCE(
    (v_verification -> 'identity_consistency' ->> 'similarity_score')::numeric,
    0
  );

  v_discord_valid := COALESCE(
    (v_verification -> 'discord_server' ->> 'valid')::boolean,
    false
  );
  v_discord_permanent := COALESCE(
    (v_verification -> 'discord_server' ->> 'is_permanent')::boolean,
    false
  );

  v_email_verified := COALESCE(
    (v_verification ->> 'email_verified')::boolean,
    false
  );

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF v_profile IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_profile.discord_id IS NULL OR v_profile.roblox_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- AUTO-APPROVAL CRITERIA:
  -- 1. Identity match >= 80%
  -- 2. Valid permanent Discord server
  -- 3. Email verified
  -- 4. Both accounts linked (checked above)
  -- Note: Roblox group membership is suggested but NOT required
  IF v_identity_score < 80 OR 
     NOT v_discord_valid OR 
     NOT v_discord_permanent OR 
     NOT v_email_verified THEN
    RETURN NEW;
  END IF;

  v_slug := lower(regexp_replace(NEW.store_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  
  SELECT * INTO v_existing_store FROM public.stores WHERE slug = v_slug LIMIT 1;
  IF v_existing_store.id IS NOT NULL THEN
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  END IF;

  INSERT INTO public.stores (
    owner_id, name, slug, description, discord_url, 
    status, is_active, reviewed_at, approved_at
  )
  VALUES (
    NEW.user_id, NEW.store_name, v_slug, NEW.store_description,
    NEW.discord_server_invite, 'approved', true,
    now(), now()
  )
  RETURNING * INTO v_store;

  INSERT INTO public.seller_balances (user_id, store_id)
  VALUES (NEW.user_id, v_store.id)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET accounts_locked = true, accounts_locked_at = now()
  WHERE user_id = NEW.user_id;

  NEW.status := 'approved';
  NEW.auto_approved := true;
  NEW.reviewed_at := now();

  RETURN NEW;
END;
$function$;
