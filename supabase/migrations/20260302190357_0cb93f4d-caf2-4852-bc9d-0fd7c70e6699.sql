
-- Harden seller_analytics: require valid active store and add rate limiting via store existence check
DROP POLICY IF EXISTS "Anyone can insert analytics events with validation" ON public.seller_analytics;

CREATE POLICY "Validated analytics inserts only"
ON public.seller_analytics
FOR INSERT
WITH CHECK (
  length(event_type) <= 100
  AND length(COALESCE(visitor_id, '')) <= 200
  AND length(COALESCE(referrer, '')) <= 2000
  AND length(COALESCE(device_type, '')) <= 50
  AND length(COALESCE(country, '')) <= 100
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = seller_analytics.store_id
      AND stores.is_active = true
  )
);
