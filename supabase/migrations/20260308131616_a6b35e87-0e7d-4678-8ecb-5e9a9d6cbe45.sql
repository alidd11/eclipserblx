
DROP FUNCTION IF EXISTS public.cleanup_expired_tracking_data();

CREATE OR REPLACE FUNCTION public.cleanup_expired_tracking_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  page_visits_deleted INTEGER;
  search_logs_deleted INTEGER;
  consent_anonymized INTEGER;
  rate_limits_deleted INTEGER;
  ai_cache_deleted INTEGER;
  download_tokens_deleted INTEGER;
  discord_codes_deleted INTEGER;
  old_audit_logs_deleted INTEGER;
  seller_analytics_deleted INTEGER;
  ad_clicks_deleted INTEGER;
BEGIN
  DELETE FROM public.page_visits WHERE visited_at < now() - interval '90 days';
  GET DIAGNOSTICS page_visits_deleted = ROW_COUNT;
  
  DELETE FROM public.search_logs WHERE searched_at < now() - interval '60 days';
  GET DIAGNOSTICS search_logs_deleted = ROW_COUNT;
  
  UPDATE public.consent_records 
  SET ip_address_hash = NULL, user_agent = NULL
  WHERE created_at < now() - interval '90 days' 
    AND ip_address_hash IS NOT NULL;
  GET DIAGNOSTICS consent_anonymized = ROW_COUNT;
  
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS rate_limits_deleted = ROW_COUNT;
  
  DELETE FROM public.ai_response_cache WHERE expires_at < now();
  GET DIAGNOSTICS ai_cache_deleted = ROW_COUNT;
  
  DELETE FROM public.download_tokens WHERE expires_at < now() - interval '1 hour';
  GET DIAGNOSTICS download_tokens_deleted = ROW_COUNT;
  
  DELETE FROM public.discord_link_codes WHERE expires_at < now() - interval '1 day';
  GET DIAGNOSTICS discord_codes_deleted = ROW_COUNT;
  
  DELETE FROM public.data_audit_log WHERE changed_at < now() - interval '180 days';
  GET DIAGNOSTICS old_audit_logs_deleted = ROW_COUNT;
  
  DELETE FROM public.seller_analytics WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS seller_analytics_deleted = ROW_COUNT;
  
  DELETE FROM public.advertisement_clicks WHERE clicked_at < now() - interval '180 days';
  GET DIAGNOSTICS ad_clicks_deleted = ROW_COUNT;

  RETURN json_build_object(
    'page_visits_deleted', page_visits_deleted,
    'search_logs_deleted', search_logs_deleted,
    'consent_anonymized', consent_anonymized,
    'rate_limits_deleted', rate_limits_deleted,
    'ai_cache_deleted', ai_cache_deleted,
    'download_tokens_deleted', download_tokens_deleted,
    'discord_codes_deleted', discord_codes_deleted,
    'audit_logs_deleted', old_audit_logs_deleted,
    'seller_analytics_deleted', seller_analytics_deleted,
    'ad_clicks_deleted', ad_clicks_deleted
  );
END;
$function$;
