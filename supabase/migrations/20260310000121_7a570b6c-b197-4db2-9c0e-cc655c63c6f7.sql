
-- =============================================================
-- FIX 1: Products — Create safe public view hiding sensitive cols
-- =============================================================

CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = on)
AS SELECT
  id, store_id, name, slug, description,
  price, category_id, images,
  is_active, is_featured, moderation_status,
  created_at, updated_at, download_count,
  release_at, robux_enabled, robux_price,
  seller_price, is_seller_product, is_resellable,
  eclipse_free_eligible, early_access_hours,
  delivery_type, external_link, is_pay_what_you_want, min_price,
  deleted_at,
  -- Sensitive columns nulled out
  NULL::jsonb AS moderation_flags,
  NULL::text AS moderation_notes,
  NULL::text AS asset_file_url
FROM public.products
WHERE is_active = true
  AND deleted_at IS NULL
  AND (release_at IS NULL OR release_at <= now());

-- =============================================================
-- FIX 2: Stores — Recreate stores_public excluding financials
-- =============================================================

CREATE OR REPLACE VIEW public.stores_public
WITH (security_invoker = on)
AS SELECT
  id, owner_id, store_id, name, slug, description,
  logo_url, banner_url, is_verified, is_active, status,
  total_sales, product_count, average_rating,
  created_at, updated_at, theme, accent_color, bio,
  discord_url, twitter_url, youtube_url, tiktok_url,
  website_url, roblox_url, hero_title, hero_subtitle,
  hero_cta_text, hero_cta_link, custom_css,
  font_heading, font_body, announcement_text,
  announcement_active, featured_product_ids,
  layout_style, show_reviews, show_social_proof,
  follower_count, about_content, is_trusted, is_testing,
  roblox_group_id, roblox_group_discount_enabled,
  roblox_group_discount_percent, roblox_group_min_rank,
  roblox_premium_discount_enabled, roblox_premium_discount_percent,
  roblox_gamepass_id, roblox_gamepass_discount_enabled,
  roblox_gamepass_discount_percent
  -- EXCLUDED: total_revenue, commission_rate, custom_commission_rate,
  -- payout_method, recruited_by, recruiter_commission_paid
FROM public.stores;

-- =============================================================
-- FIX 3: orders_seller_view — Ensure SECURITY INVOKER
-- =============================================================

CREATE OR REPLACE VIEW public.orders_seller_view
WITH (security_invoker = on)
AS SELECT
  id, user_id, status, total, subtotal,
  payment_method, payment_id, created_at, updated_at,
  CASE
    WHEN user_id = auth.uid() THEN customer_email
    WHEN has_permission(auth.uid(), 'view_orders') THEN customer_email
    ELSE mask_email(customer_email)
  END AS customer_email,
  discount_amount, discount_code_id,
  refunded_at, refund_amount, refund_id
FROM public.orders;

-- =============================================================
-- FIX 4: ip_shield_stats — Security invoker + RLS on source
-- =============================================================

CREATE OR REPLACE VIEW public.ip_shield_stats
WITH (security_invoker = on)
AS SELECT
  creator_id,
  count(*) FILTER (WHERE dismissed_at IS NULL AND creator_verified = false) AS active_detections,
  count(*) FILTER (WHERE similarity_score >= 70 AND dismissed_at IS NULL AND creator_verified = false) AS high_threat_count,
  count(*) FILTER (WHERE similarity_score >= 40 AND similarity_score < 70 AND dismissed_at IS NULL AND creator_verified = false) AS medium_threat_count,
  count(*) FILTER (WHERE similarity_score < 40 AND dismissed_at IS NULL AND creator_verified = false) AS low_threat_count,
  count(*) FILTER (WHERE takedown_request_id IS NOT NULL) AS takedowns_filed,
  count(*) FILTER (WHERE dismissed_at IS NOT NULL) AS dismissed_count,
  count(*) FILTER (WHERE thumbnail_analyzed = true) AS thumbnails_scanned,
  avg(similarity_score) FILTER (WHERE dismissed_at IS NULL AND creator_verified = false) AS avg_similarity,
  max(last_seen_at) AS last_scan_at,
  count(DISTINCT detected_universe_id) AS unique_copies_found
FROM public.ip_copy_detections
GROUP BY creator_id;

ALTER TABLE public.ip_copy_detections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view detections" ON public.ip_copy_detections;
DROP POLICY IF EXISTS "Public can view detections" ON public.ip_copy_detections;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ip_copy_detections' AND policyname = 'Creators can view own detections'
  ) THEN
    CREATE POLICY "Creators can view own detections"
      ON public.ip_copy_detections FOR SELECT TO authenticated
      USING (creator_id = auth.uid() OR is_staff(auth.uid()));
  END IF;
END $$;

-- =============================================================
-- FIX 5: feature_flags — Stop exposing user_ids to anon
-- =============================================================

DROP POLICY IF EXISTS "Anyone can read feature flags" ON public.feature_flags;

-- Authenticated users can read flags (needed for the hook to check user_ids)
CREATE POLICY "Authenticated can read feature flags"
  ON public.feature_flags FOR SELECT TO authenticated
  USING (true);

-- Anon users should not be able to read feature flags at all
-- (feature flags are only used for authenticated user gating)
