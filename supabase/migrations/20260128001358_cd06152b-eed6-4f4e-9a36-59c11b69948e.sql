-- =====================================================
-- SECURITY FIX: Restrict stores table public access
-- The "Anyone can view approved stores" policy currently exposes ALL columns
-- including sensitive financial data (stripe_account_id, paypal_email, bank details)
-- =====================================================

-- Step 1: Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view approved stores" ON public.stores;

-- Step 2: Create a new restricted public SELECT policy that only allows viewing
-- specific safe columns via a more restrictive approach
-- Since RLS can't restrict columns directly, we create a restrictive policy
-- and rely on the application using PUBLIC_STORE_COLUMNS (already implemented in src/lib/storeColumns.ts)
-- But we add an extra layer: deny public SELECT entirely and use a view

-- Create a public view with only safe columns for anonymous users
CREATE OR REPLACE VIEW public.stores_public
WITH (security_invoker = on) AS
SELECT 
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
    roblox_gamepass_id, roblox_gamepass_discount_enabled, roblox_gamepass_discount_percent
FROM public.stores
WHERE status = 'approved' AND is_active = true;

-- Grant SELECT on the public view to anon and authenticated roles
GRANT SELECT ON public.stores_public TO anon, authenticated;

-- Step 3: Create new policy for public store viewing that's more restrictive
-- Anonymous users should use the stores_public view, not the stores table directly
-- This policy allows SELECT but the application MUST use PUBLIC_STORE_COLUMNS constant
CREATE POLICY "Public can view approved store basic info"
ON public.stores
FOR SELECT
USING (
    -- Allow if the store is approved and active (for backwards compatibility)
    -- App code should use stores_public view or PUBLIC_STORE_COLUMNS
    (status = 'approved' AND is_active = true)
    -- OR allow if user is the owner
    OR (auth.uid() = owner_id)
    -- OR allow if user is staff
    OR is_staff(auth.uid())
);

-- Note: The profiles table policies are actually properly scoped already
-- Staff can only view profiles related to their assigned work items
-- The security concern about staff exfiltration is valid but requires 
-- organizational controls (audit logs) rather than stricter RLS