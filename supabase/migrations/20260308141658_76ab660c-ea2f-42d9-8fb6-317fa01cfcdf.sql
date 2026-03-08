-- Recreate stores_public view WITHOUT sensitive financial columns
DROP VIEW IF EXISTS public.stores_public;

CREATE VIEW public.stores_public AS
SELECT 
  id, owner_id, store_id, name, slug, description, logo_url, banner_url,
  is_verified, is_active, status, total_sales, product_count,
  average_rating, created_at, updated_at, theme, accent_color, bio,
  discord_url, twitter_url, youtube_url, tiktok_url, website_url, roblox_url,
  hero_title, hero_subtitle, hero_cta_text, hero_cta_link, custom_css,
  font_heading, font_body, announcement_text, announcement_active,
  featured_product_ids, layout_style, show_reviews, show_social_proof,
  follower_count, about_content, is_trusted, is_testing,
  roblox_group_id, roblox_group_discount_enabled, roblox_group_discount_percent,
  roblox_group_min_rank, roblox_premium_discount_enabled, roblox_premium_discount_percent,
  roblox_gamepass_id, roblox_gamepass_discount_enabled, roblox_gamepass_discount_percent
FROM stores;