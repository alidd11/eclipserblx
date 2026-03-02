
-- 1. Tighten ip_violation_reports: scope INSERT to auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create IP reports" ON public.ip_violation_reports;
CREATE POLICY "Authenticated users can create own IP reports"
ON public.ip_violation_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
  AND length(description) <= 5000
  AND length(reporter_name) <= 200
  AND length(reporter_email) <= 320
  AND length(violation_type) <= 100
);

-- 2. Tighten advertisement_clicks: validate text field lengths
DROP POLICY IF EXISTS "Anyone can record ad clicks" ON public.advertisement_clicks;
CREATE POLICY "Anyone can record ad clicks with validation"
ON public.advertisement_clicks
FOR INSERT
TO public
WITH CHECK (
  length(COALESCE(visitor_id, '')) <= 200
  AND length(COALESCE(referrer, '')) <= 2000
  AND length(COALESCE(user_agent, '')) <= 1000
  AND length(COALESCE(device_type, '')) <= 50
  AND length(COALESCE(country, '')) <= 100
);

-- 3. Tighten page_visits: validate text field lengths
DROP POLICY IF EXISTS "Anyone can insert page visits" ON public.page_visits;
CREATE POLICY "Anyone can insert page visits with validation"
ON public.page_visits
FOR INSERT
TO public
WITH CHECK (
  length(page_path) <= 500
  AND length(visitor_id) <= 200
  AND length(COALESCE(user_agent, '')) <= 1000
  AND length(COALESCE(referrer, '')) <= 2000
  AND length(COALESCE(ip_hash, '')) <= 128
  AND length(COALESCE(country, '')) <= 100
  AND length(COALESCE(device_type, '')) <= 50
  AND length(COALESCE(browser, '')) <= 100
);

-- 4. Tighten referral_clicks: validate text field lengths
DROP POLICY IF EXISTS "Anyone can record referral clicks" ON public.referral_clicks;
CREATE POLICY "Anyone can record referral clicks with validation"
ON public.referral_clicks
FOR INSERT
TO public
WITH CHECK (
  length(referral_code) <= 50
  AND length(COALESCE(visitor_ip_hash, '')) <= 128
  AND length(COALESCE(user_agent, '')) <= 1000
);

-- 5. Tighten search_logs: validate text field lengths
DROP POLICY IF EXISTS "Anyone can log searches" ON public.search_logs;
CREATE POLICY "Anyone can log searches with validation"
ON public.search_logs
FOR INSERT
TO public
WITH CHECK (
  length(query) <= 500
  AND COALESCE(results_count, 0) >= 0
  AND COALESCE(results_count, 0) <= 10000
);

-- 6. Tighten seller_analytics: validate text field lengths
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.seller_analytics;
CREATE POLICY "Anyone can insert analytics events with validation"
ON public.seller_analytics
FOR INSERT
TO public
WITH CHECK (
  length(event_type) <= 100
  AND length(COALESCE(visitor_id, '')) <= 200
  AND length(COALESCE(referrer, '')) <= 2000
  AND length(COALESCE(device_type, '')) <= 50
  AND length(COALESCE(country, '')) <= 100
);
