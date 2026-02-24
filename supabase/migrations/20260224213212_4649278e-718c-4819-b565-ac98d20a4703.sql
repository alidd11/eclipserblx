
-- Fix the security definer view by making it security invoker
DROP VIEW IF EXISTS public.ip_shield_stats;

CREATE VIEW public.ip_shield_stats WITH (security_invoker = true) AS
SELECT 
  creator_id,
  COUNT(*) FILTER (WHERE dismissed_at IS NULL AND creator_verified = false) as active_detections,
  COUNT(*) FILTER (WHERE similarity_score >= 70 AND dismissed_at IS NULL AND creator_verified = false) as high_threat_count,
  COUNT(*) FILTER (WHERE similarity_score >= 40 AND similarity_score < 70 AND dismissed_at IS NULL AND creator_verified = false) as medium_threat_count,
  COUNT(*) FILTER (WHERE similarity_score < 40 AND dismissed_at IS NULL AND creator_verified = false) as low_threat_count,
  COUNT(*) FILTER (WHERE takedown_request_id IS NOT NULL) as takedowns_filed,
  COUNT(*) FILTER (WHERE dismissed_at IS NOT NULL) as dismissed_count,
  COUNT(*) FILTER (WHERE thumbnail_analyzed = true) as thumbnails_scanned,
  AVG(similarity_score) FILTER (WHERE dismissed_at IS NULL AND creator_verified = false) as avg_similarity,
  MAX(last_seen_at) as last_scan_at,
  COUNT(DISTINCT detected_universe_id) as unique_copies_found
FROM public.ip_copy_detections
GROUP BY creator_id;
