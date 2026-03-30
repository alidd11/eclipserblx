
-- Revoke table-level SELECT from anon on products, then re-grant on all columns EXCEPT asset_file_url
REVOKE SELECT ON public.products FROM anon;

GRANT SELECT (
  id, name, slug, description, price, category_id, images,
  is_featured, is_active, download_count, created_at, updated_at,
  release_at, robux_enabled, robux_product_id, robux_price,
  store_id, seller_price, moderation_status, moderation_notes,
  is_seller_product, discord_thread_id, discord_message_id,
  is_resellable, release_notified_at, deleted_at,
  eclipse_free_eligible, ip_ownership_confirmed, moderation_flags,
  early_access_hours, file_review_consented_at, file_review_requested_at,
  feed_notified_at, external_link, delivery_type,
  is_pay_what_you_want, min_price, product_number
) ON public.products TO anon;
