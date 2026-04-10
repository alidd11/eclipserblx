
-- ============================================================
-- 1. FIX: Reviews privilege escalation
-- ============================================================

-- Drop existing overly-permissive UPDATE policies
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Sellers can reply to reviews on their products" ON public.reviews;

-- Users can ONLY update content, title, rating (not is_approved, is_featured, etc.)
CREATE POLICY "Users can update own review content"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_approved = (SELECT r.is_approved FROM public.reviews r WHERE r.id = reviews.id)
  AND is_featured = (SELECT r.is_featured FROM public.reviews r WHERE r.id = reviews.id)
  AND is_verified_purchase = (SELECT r.is_verified_purchase FROM public.reviews r WHERE r.id = reviews.id)
  AND seller_reply IS NOT DISTINCT FROM (SELECT r.seller_reply FROM public.reviews r WHERE r.id = reviews.id)
  AND seller_replied_at IS NOT DISTINCT FROM (SELECT r.seller_replied_at FROM public.reviews r WHERE r.id = reviews.id)
);

-- Sellers can ONLY set seller_reply and seller_replied_at (not rating, content, is_approved, etc.)
CREATE POLICY "Sellers can reply to reviews only"
ON public.reviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = reviews.product_id AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = reviews.product_id AND s.owner_id = auth.uid()
  )
  AND rating = (SELECT r.rating FROM public.reviews r WHERE r.id = reviews.id)
  AND title IS NOT DISTINCT FROM (SELECT r.title FROM public.reviews r WHERE r.id = reviews.id)
  AND content IS NOT DISTINCT FROM (SELECT r.content FROM public.reviews r WHERE r.id = reviews.id)
  AND is_approved = (SELECT r.is_approved FROM public.reviews r WHERE r.id = reviews.id)
  AND is_featured = (SELECT r.is_featured FROM public.reviews r WHERE r.id = reviews.id)
  AND user_id = (SELECT r.user_id FROM public.reviews r WHERE r.id = reviews.id)
);

-- ============================================================
-- 2. FIX: Product promotions public data exposure
-- ============================================================

-- Create a safe public view that only exposes ad-rendering fields
CREATE OR REPLACE VIEW public.product_promotions_public
WITH (security_invoker = on) AS
SELECT
  id,
  store_id,
  product_id,
  category_id,
  status,
  placement_zones,
  creative_images,
  started_at,
  expires_at,
  campaign_name,
  goal,
  target_devices,
  target_countries
FROM public.product_promotions
WHERE status = 'active';

-- Drop the public SELECT policy on the raw table
DROP POLICY IF EXISTS "Active promotions are public" ON public.product_promotions;

-- ============================================================
-- 3. FIX: Stores financial data public exposure
-- ============================================================

-- Drop the overly broad public SELECT policy that exposes all columns
DROP POLICY IF EXISTS "Public can view approved stores" ON public.stores;

-- Re-create a public policy scoped to owner and staff only (view handles public access)
CREATE POLICY "Owner or staff can view stores"
ON public.stores
FOR SELECT
USING (
  auth.uid() = owner_id
  OR is_staff(auth.uid())
);

-- Grant SELECT on the stores_public view to anon and authenticated
GRANT SELECT ON public.stores_public TO anon, authenticated;
GRANT SELECT ON public.product_promotions_public TO anon, authenticated;
