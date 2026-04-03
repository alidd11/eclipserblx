-- Add auto_approved column to track auto-approvals
ALTER TABLE public.store_applications 
ADD COLUMN IF NOT EXISTS auto_approved boolean DEFAULT false;

-- Create the auto-approval function
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
  v_group_member boolean;
  v_email_verified boolean;
  v_slug text;
  v_store RECORD;
  v_existing_store RECORD;
BEGIN
  -- Only run on INSERT with 'pending' status
  IF TG_OP != 'INSERT' OR NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get verification results from the application
  v_verification := NEW.verification_results;
  
  -- If no verification results, skip auto-approval
  IF v_verification IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check identity consistency score (must be >= 80)
  v_identity_score := COALESCE(
    (v_verification -> 'identity_consistency' ->> 'similarity_score')::numeric,
    0
  );

  -- Check Discord server validity
  v_discord_valid := COALESCE(
    (v_verification -> 'discord_server' ->> 'valid')::boolean,
    false
  );
  v_discord_permanent := COALESCE(
    (v_verification -> 'discord_server' ->> 'is_permanent')::boolean,
    false
  );

  -- Check Roblox group membership
  v_group_member := COALESCE(
    (v_verification -> 'roblox_group' ->> 'in_group')::boolean,
    false
  );

  -- Check email verified
  v_email_verified := COALESCE(
    (v_verification ->> 'email_verified')::boolean,
    false
  );

  -- Get user profile to verify accounts are linked
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF v_profile IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if both accounts are linked
  IF v_profile.discord_id IS NULL OR v_profile.roblox_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- AUTO-APPROVAL CRITERIA:
  -- 1. Identity match >= 80%
  -- 2. Roblox group member
  -- 3. Valid permanent Discord server
  -- 4. Email verified
  -- 5. Both accounts linked (checked above)
  IF v_identity_score < 80 OR 
     NOT v_group_member OR 
     NOT v_discord_valid OR 
     NOT v_discord_permanent OR 
     NOT v_email_verified THEN
    -- Criteria not met, leave as pending for manual review
    RETURN NEW;
  END IF;

  -- All criteria met — auto-approve!
  
  -- Generate store slug
  v_slug := lower(regexp_replace(NEW.store_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  
  -- Check slug collision
  SELECT * INTO v_existing_store FROM public.stores WHERE slug = v_slug LIMIT 1;
  IF v_existing_store.id IS NOT NULL THEN
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  END IF;

  -- Create the store
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

  -- Create seller balance record
  INSERT INTO public.seller_balances (user_id, store_id)
  VALUES (NEW.user_id, v_store.id)
  ON CONFLICT DO NOTHING;

  -- Lock linked accounts
  UPDATE public.profiles
  SET accounts_locked = true, accounts_locked_at = now()
  WHERE user_id = NEW.user_id;

  -- Update the application to approved
  NEW.status := 'approved';
  NEW.auto_approved := true;
  NEW.reviewed_at := now();

  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_approve_store_application ON public.store_applications;
CREATE TRIGGER trg_auto_approve_store_application
  BEFORE INSERT ON public.store_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.try_auto_approve_store_application();