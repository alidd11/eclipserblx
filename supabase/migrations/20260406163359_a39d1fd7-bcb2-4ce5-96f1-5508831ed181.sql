DROP VIEW IF EXISTS public.stores_public;

CREATE VIEW public.stores_public AS
SELECT
  id, name, slug, description, logo_url, banner_url,
  status, is_active, is_verified, owner_id,
  accent_color, theme, font_heading, font_body,
  custom_css, about_content,
  discord_url, twitter_url, youtube_url, tiktok_url, website_url, roblox_url,
  product_count, average_rating, follower_count,
  hero_title, hero_subtitle, hero_cta_text, hero_cta_link,
  announcement_text, announcement_active,
  featured_product_ids, layout_style, show_reviews, show_social_proof,
  bio, store_layout, favicon_url, hide_branding,
  roblox_group_id, roblox_group_discount_enabled, roblox_group_discount_percent, roblox_group_min_rank,
  roblox_premium_discount_enabled, roblox_premium_discount_percent,
  roblox_gamepass_id, roblox_gamepass_discount_enabled, roblox_gamepass_discount_percent,
  pwyw_enabled, is_trusted,
  created_at, updated_at
FROM public.stores
WHERE status = 'approved' AND is_active = true;

GRANT SELECT ON public.stores_public TO anon;
GRANT SELECT ON public.stores_public TO authenticated;