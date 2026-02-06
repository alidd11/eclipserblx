/**
 * Centralized column definitions for optimized database queries.
 * Using explicit column selection instead of select('*') reduces:
 * - Network payload size
 * - Memory usage
 * - Query execution time
 */

// Product columns for list views (minimal data for cards)
export const PRODUCT_LIST_COLUMNS = `
  id, name, slug, price, images, is_active, is_featured,
  category_id, store_id, created_at, is_resellable, download_count
`;

// Product columns with category info
export const PRODUCT_WITH_CATEGORY_COLUMNS = `
  id, name, slug, price, images, is_active, is_featured,
  category_id, store_id, created_at, is_resellable, download_count,
  categories (id, name, slug)
`;

// Product columns with store info
export const PRODUCT_WITH_STORE_COLUMNS = `
  id, name, slug, price, images, is_active, is_featured,
  category_id, store_id, created_at, is_resellable, download_count,
  stores (name, slug, logo_url, is_verified, is_trusted, is_active)
`;

// Product columns with both category and store
export const PRODUCT_FULL_LIST_COLUMNS = `
  id, name, slug, price, images, is_active, is_featured,
  category_id, store_id, created_at, is_resellable, download_count,
  categories (id, name, slug),
  stores (name, slug, logo_url, is_verified, is_trusted, is_active)
`;

// Product detail page columns
export const PRODUCT_DETAIL_COLUMNS = `
  id, name, slug, description, price, images, is_active, is_featured,
  category_id, store_id, created_at, updated_at, is_resellable,
  download_count, release_at, youtube_url, features, installation_guide,
  categories (id, name, slug, description),
  stores!inner (
    id, name, slug, description, logo_url, banner_url,
    is_verified, is_trusted, is_active, follower_count
  )
`;

// Store columns for public display (excludes sensitive data)
export const STORE_PUBLIC_COLUMNS = `
  id, name, slug, description, logo_url, banner_url,
  is_verified, is_trusted, is_active, follower_count, product_count,
  average_rating, total_sales, theme, accent_color, bio,
  discord_url, twitter_url, youtube_url, tiktok_url, website_url, roblox_url,
  hero_title, hero_subtitle, hero_cta_text, hero_cta_link,
  font_heading, font_body, announcement_text, announcement_active,
  layout_style, show_reviews, show_social_proof, about_content
`;

// Category columns
export const CATEGORY_LIST_COLUMNS = `
  id, name, slug, description, icon, display_order, parent_id
`;

// Order columns for customer view
export const ORDER_LIST_COLUMNS = `
  id, user_id, total, status, created_at, payment_method,
  discount_code, discount_amount
`;

// Order with items
export const ORDER_WITH_ITEMS_COLUMNS = `
  id, user_id, total, status, created_at, payment_method,
  discount_code, discount_amount,
  order_items (
    id, product_id, quantity, price,
    products (id, name, slug, images)
  )
`;

// Review columns
export const REVIEW_LIST_COLUMNS = `
  id, user_id, product_id, rating, comment, is_approved, created_at
`;

// Profile columns for public display
export const PROFILE_PUBLIC_COLUMNS = `
  user_id, display_name, username, avatar_url, bio, location,
  discord_id, discord_username, is_public
`;

// Profile columns for admin
export const PROFILE_ADMIN_COLUMNS = `
  user_id, display_name, username, avatar_url, email, bio,
  location, customer_id, staff_id, discord_id, discord_username,
  is_public, created_at
`;

// Wishlist columns
export const WISHLIST_COLUMNS = `
  id, created_at, product_id,
  products (
    id, name, slug, price, images, is_active, store_id,
    stores (name, slug)
  )
`;

// Seller transaction columns
export const SELLER_TRANSACTION_COLUMNS = `
  id, type, gross_amount, commission_amount, net_amount,
  created_at, order_id, description
`;

// Forum post columns
export const FORUM_POST_COLUMNS = `
  id, user_id, thread_id, content, is_solution, created_at, updated_at
`;

// Forum thread columns
export const FORUM_THREAD_COLUMNS = `
  id, title, slug, user_id, category_id, is_pinned, is_locked,
  view_count, created_at, updated_at
`;
