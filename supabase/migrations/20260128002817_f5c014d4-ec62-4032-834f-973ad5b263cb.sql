
-- =====================================================
-- SECURITY FIX: Remove deprecated columns and separate financial data
-- =====================================================

-- STEP 1: Drop deprecated Discord columns from stores table (already migrated to store_credentials)
ALTER TABLE public.stores DROP COLUMN IF EXISTS discord_webhook_url;
ALTER TABLE public.stores DROP COLUMN IF EXISTS discord_bot_token;
ALTER TABLE public.stores DROP COLUMN IF EXISTS discord_guild_id;
ALTER TABLE public.stores DROP COLUMN IF EXISTS discord_role_id;
ALTER TABLE public.stores DROP COLUMN IF EXISTS review_discord_webhook_url;

-- STEP 2: Create store_payment_details table for sensitive financial data
CREATE TABLE IF NOT EXISTS public.store_payment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID UNIQUE NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  paypal_email TEXT,
  payout_method TEXT DEFAULT 'stripe',
  payouts_enabled BOOLEAN DEFAULT false,
  bank_name TEXT,
  bank_account_holder TEXT,
  bank_account_number TEXT,
  bank_routing_number TEXT,
  bank_swift_bic TEXT,
  bank_country TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on store_payment_details
ALTER TABLE public.store_payment_details ENABLE ROW LEVEL SECURITY;

-- RLS: Only store owners can view their own payment details
CREATE POLICY "Owners can view own payment details" 
ON public.store_payment_details FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.stores s 
  WHERE s.id = store_payment_details.store_id 
  AND s.owner_id = auth.uid()
));

-- RLS: Only store owners can update their own payment details
CREATE POLICY "Owners can update own payment details" 
ON public.store_payment_details FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.stores s 
  WHERE s.id = store_payment_details.store_id 
  AND s.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.stores s 
  WHERE s.id = store_payment_details.store_id 
  AND s.owner_id = auth.uid()
));

-- RLS: Store owners can insert their own payment details
CREATE POLICY "Owners can insert own payment details" 
ON public.store_payment_details FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.stores s 
  WHERE s.id = store_payment_details.store_id 
  AND s.owner_id = auth.uid()
));

-- RLS: Admins can view all payment details
CREATE POLICY "Admins can view all payment details" 
ON public.store_payment_details FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- RLS: Admins can manage all payment details
CREATE POLICY "Admins can manage payment details" 
ON public.store_payment_details FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- STEP 3: Migrate existing payment data from stores to store_payment_details
INSERT INTO public.store_payment_details (
  store_id, stripe_account_id, paypal_email, payout_method, payouts_enabled,
  bank_name, bank_account_holder, bank_account_number, bank_routing_number, bank_swift_bic, bank_country
)
SELECT 
  id, stripe_account_id, paypal_email, payout_method, payouts_enabled,
  bank_name, bank_account_holder, bank_account_number, bank_routing_number, bank_swift_bic, bank_country
FROM public.stores
WHERE stripe_account_id IS NOT NULL 
   OR paypal_email IS NOT NULL 
   OR bank_account_number IS NOT NULL
ON CONFLICT (store_id) DO UPDATE SET
  stripe_account_id = EXCLUDED.stripe_account_id,
  paypal_email = EXCLUDED.paypal_email,
  payout_method = EXCLUDED.payout_method,
  payouts_enabled = EXCLUDED.payouts_enabled,
  bank_name = EXCLUDED.bank_name,
  bank_account_holder = EXCLUDED.bank_account_holder,
  bank_account_number = EXCLUDED.bank_account_number,
  bank_routing_number = EXCLUDED.bank_routing_number,
  bank_swift_bic = EXCLUDED.bank_swift_bic,
  bank_country = EXCLUDED.bank_country;

-- STEP 4: Create auto-insert trigger for new stores
CREATE OR REPLACE FUNCTION public.create_store_payment_details()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.store_payment_details (store_id)
  VALUES (NEW.id)
  ON CONFLICT (store_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_store_payment_details_trigger
AFTER INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.create_store_payment_details();

-- STEP 5: Drop sensitive payment columns from stores table (data now in store_payment_details)
ALTER TABLE public.stores DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE public.stores DROP COLUMN IF EXISTS paypal_email;
ALTER TABLE public.stores DROP COLUMN IF EXISTS payouts_enabled;
ALTER TABLE public.stores DROP COLUMN IF EXISTS bank_name;
ALTER TABLE public.stores DROP COLUMN IF EXISTS bank_account_holder;
ALTER TABLE public.stores DROP COLUMN IF EXISTS bank_account_number;
ALTER TABLE public.stores DROP COLUMN IF EXISTS bank_routing_number;
ALTER TABLE public.stores DROP COLUMN IF EXISTS bank_swift_bic;
ALTER TABLE public.stores DROP COLUMN IF EXISTS bank_country;

-- STEP 6: Update the stores_public view to ensure it doesn't include any leftover sensitive fields
DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public WITH (security_invoker=on) AS
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
  roblox_gamepass_id, roblox_gamepass_discount_enabled, roblox_gamepass_discount_percent,
  commission_rate, custom_commission_rate, payout_method
FROM public.stores;

-- Grant access to stores_public view
GRANT SELECT ON public.stores_public TO authenticated;
GRANT SELECT ON public.stores_public TO anon;

-- Add updated_at trigger for store_payment_details
CREATE TRIGGER update_store_payment_details_updated_at
BEFORE UPDATE ON public.store_payment_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
