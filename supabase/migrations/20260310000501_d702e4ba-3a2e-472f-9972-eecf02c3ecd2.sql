
-- Fix products_public view: ensure asset_file_url is truly NULL
DROP VIEW IF EXISTS public.products_public;

CREATE VIEW public.products_public
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
  deleted_at
  -- asset_file_url, moderation_flags, moderation_notes fully excluded
FROM public.products
WHERE is_active = true
  AND deleted_at IS NULL
  AND (release_at IS NULL OR release_at <= now());
