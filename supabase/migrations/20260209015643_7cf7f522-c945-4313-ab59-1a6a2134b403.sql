-- Update the get_global_guard_limits function to give Eclipse+ members 3 servers instead of unlimited
CREATE OR REPLACE FUNCTION public.get_global_guard_limits(_user_id uuid)
 RETURNS TABLE(max_servers integer, max_active_bans integer, has_priority_sync boolean, has_ban_templates boolean, is_premium boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_usage RECORD;
  v_is_eclipse_plus BOOLEAN;
BEGIN
  -- Check if user has Eclipse+ subscription
  v_is_eclipse_plus := public.has_premium_global_guard(_user_id);
  
  -- Check for active Global Guard subscription
  SELECT * INTO v_usage
  FROM public.global_guard_server_usage
  WHERE user_id = _user_id
    AND status = 'active'
    AND billing_period_end > now();
  
  IF FOUND THEN
    -- User has an active Global Guard subscription
    RETURN QUERY SELECT 
      v_usage.total_servers as max_servers,
      NULL::integer as max_active_bans,
      true as has_priority_sync,
      true as has_ban_templates,
      true as is_premium;
  ELSIF v_is_eclipse_plus THEN
    -- Eclipse+ members get 3 servers free (but can upgrade for more)
    RETURN QUERY SELECT 
      3::integer as max_servers,
      NULL::integer as max_active_bans,
      true as has_priority_sync,
      true as has_ban_templates,
      false as is_premium; -- Not "premium Global Guard" but has Eclipse+ benefits
  ELSE
    -- Free tier: 1 server max
    RETURN QUERY SELECT 
      1::integer as max_servers,
      NULL::integer as max_active_bans,
      false as has_priority_sync,
      false as has_ban_templates,
      false as is_premium;
  END IF;
END;
$function$;