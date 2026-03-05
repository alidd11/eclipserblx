
-- =====================================================
-- DATA RETENTION: Auto-purge old tracking/analytics data
-- =====================================================

-- Function to clean up old tracking data with configurable retention periods
CREATE OR REPLACE FUNCTION public.cleanup_expired_tracking_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_page_visits INTEGER := 0;
  v_deleted_search_logs INTEGER := 0;
  v_deleted_rate_limits INTEGER := 0;
  v_deleted_referral_clicks INTEGER := 0;
  v_deleted_ad_clicks INTEGER := 0;
  v_deleted_seller_analytics INTEGER := 0;
  v_anonymized_download_logs INTEGER := 0;
BEGIN
  -- Delete page_visits older than 90 days
  DELETE FROM public.page_visits
  WHERE visited_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_page_visits = ROW_COUNT;

  -- Delete search_logs older than 60 days
  DELETE FROM public.search_logs
  WHERE searched_at < now() - interval '60 days';
  GET DIAGNOSTICS v_deleted_search_logs = ROW_COUNT;

  -- Delete rate_limits older than 24 hours (already partially done, but ensure full cleanup)
  DELETE FROM public.rate_limits
  WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_deleted_rate_limits = ROW_COUNT;

  -- Anonymize referral_clicks IP hashes older than 30 days (keep click record, remove PII)
  UPDATE public.referral_clicks
  SET ip_hash = 'anonymized', user_agent = NULL
  WHERE created_at < now() - interval '30 days'
    AND ip_hash != 'anonymized';
  GET DIAGNOSTICS v_deleted_referral_clicks = ROW_COUNT;

  -- Delete advertisement_clicks older than 180 days
  DELETE FROM public.advertisement_clicks
  WHERE clicked_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted_ad_clicks = ROW_COUNT;

  -- Delete seller_analytics older than 180 days
  DELETE FROM public.seller_analytics
  WHERE visited_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted_seller_analytics = ROW_COUNT;

  -- Anonymize download_logs IP/user_agent older than 90 days (keep download record for stats)
  UPDATE public.download_logs
  SET ip_address = 'anonymized', user_agent = NULL
  WHERE downloaded_at < now() - interval '90 days'
    AND ip_address IS NOT NULL
    AND ip_address != 'anonymized';
  GET DIAGNOSTICS v_anonymized_download_logs = ROW_COUNT;

  -- Delete expired user_ip_logs older than 90 days
  DELETE FROM public.user_ip_logs
  WHERE created_at < now() - interval '90 days';

  -- Delete expired download_tokens
  PERFORM public.cleanup_expired_download_tokens();

  -- Delete expired discord_link_codes
  PERFORM public.cleanup_expired_link_codes();

  RETURN jsonb_build_object(
    'page_visits_deleted', v_deleted_page_visits,
    'search_logs_deleted', v_deleted_search_logs,
    'rate_limits_deleted', v_deleted_rate_limits,
    'referral_clicks_anonymized', v_deleted_referral_clicks,
    'ad_clicks_deleted', v_deleted_ad_clicks,
    'seller_analytics_deleted', v_deleted_seller_analytics,
    'download_logs_anonymized', v_anonymized_download_logs,
    'cleaned_at', now()
  );
END;
$$;
