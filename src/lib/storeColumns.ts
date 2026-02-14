/**
 * SECURITY: Safe column lists for store queries
 * 
 * These constants define which columns are safe to expose publicly vs. which require owner/admin access.
 * 
 * NEVER add sensitive columns to PUBLIC_STORE_COLUMNS:
 * - discord_webhook_url, review_discord_webhook_url, discord_bot_token
 * - discord_guild_id, discord_role_id (internal Discord config)
 * - stripe_account_id, payouts_enabled, commission_rate, custom_commission_rate
 * - paypal_email, payout_method
 * - bank_name, bank_account_holder, bank_account_number, bank_routing_number, bank_swift_bic, bank_country
 */

// Safe columns for public store viewing (anonymous users, store pages)
export const PUBLIC_STORE_COLUMNS = `
  id, owner_id, store_id, name, slug, description, logo_url, banner_url,
  is_verified, is_active, status, total_sales, total_revenue, product_count,
  average_rating, created_at, updated_at, theme, accent_color, bio,
  discord_url, twitter_url, youtube_url, tiktok_url, website_url, roblox_url,
  hero_title, hero_subtitle, hero_cta_text, hero_cta_link, custom_css,
  font_heading, font_body, announcement_text, announcement_active,
  featured_product_ids, layout_style, show_reviews, show_social_proof,
  follower_count, about_content, is_trusted, is_testing,
  roblox_group_id, roblox_group_discount_enabled, roblox_group_discount_percent,
  roblox_group_min_rank, roblox_premium_discount_enabled, roblox_premium_discount_percent,
  roblox_gamepass_id, roblox_gamepass_discount_enabled, roblox_gamepass_discount_percent,
  eclipse_plus_discount_enabled
`;

// Minimal columns for store listings (marketplace, search results)
export const STORE_LISTING_COLUMNS = `
  id, name, slug, description, logo_url, banner_url, accent_color,
  is_verified, is_trusted, follower_count, is_testing, average_rating,
  product_count, eclipse_plus_discount_enabled
`;

// Minimal columns for store cards/references
export const STORE_REFERENCE_COLUMNS = `id, name, slug, logo_url, accent_color`;
