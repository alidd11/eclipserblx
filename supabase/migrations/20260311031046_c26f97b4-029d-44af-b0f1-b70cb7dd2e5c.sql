DROP FUNCTION IF EXISTS public.claim_payout_for_processing(uuid, text, text);

CREATE FUNCTION public.claim_payout_for_processing(p_payout_id uuid, p_lock_id text, p_expected_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row_count integer;
BEGIN
  UPDATE public.seller_payouts
  SET 
    processing_locked_at = now(),
    processing_lock_id = p_lock_id
  WHERE id = p_payout_id
    AND status = p_expected_status
    AND (processing_locked_at IS NULL OR processing_locked_at < now() - interval '10 minutes');
  
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$function$;