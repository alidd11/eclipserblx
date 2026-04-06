
-- =============================================
-- 1. Seed manage_support permission
-- =============================================
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_support', 'Access and manage contact messages and support tickets', 'support')
ON CONFLICT (name) DO NOTHING;

-- Assign to admin and lead_administrator
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.name, p.id
FROM public.custom_roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('admin', 'lead_administrator')
  AND p.name = 'manage_support'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Also assign view_audit_logs to admin and lead_administrator if not already
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.name, p.id
FROM public.custom_roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('admin', 'lead_administrator')
  AND p.name = 'view_audit_logs'
ON CONFLICT (role, permission_id) DO NOTHING;

-- =============================================
-- 2. Masking function (already exists as mask_account, but let's use it)
-- =============================================
-- mask_account already exists, we'll use it in views

-- =============================================
-- 3. Secure views
-- =============================================

-- Store credentials safe view
CREATE OR REPLACE VIEW public.store_credentials_safe AS
SELECT
  id, store_id,
  discord_webhook_url, review_discord_webhook_url,
  public.mask_account(discord_bot_token) AS discord_bot_token,
  discord_guild_id, discord_role_id,
  product_drops_role_id, early_product_drops_role_id,
  public.mask_account(cloudflare_api_token) AS cloudflare_api_token,
  cloudflare_zone_id,
  orders_channel_id, refunds_channel_id, disputes_channel_id,
  sales_channel_id, product_feed_channel_id,
  created_at, updated_at
FROM public.store_credentials;

-- Store payment details safe view
CREATE OR REPLACE VIEW public.store_payment_details_safe AS
SELECT
  id, store_id, stripe_account_id, paypal_email, payout_method,
  payouts_enabled, bank_name, bank_account_holder,
  public.mask_account(bank_account_number) AS bank_account_number,
  public.mask_account(bank_routing_number) AS bank_routing_number,
  public.mask_account(bank_swift_bic) AS bank_swift_bic,
  bank_country, created_at, updated_at, details_submitted
FROM public.store_payment_details;

-- User payment details safe view
CREATE OR REPLACE VIEW public.user_payment_details_safe AS
SELECT
  user_id, preferred_payout_method, paypal_email, stripe_account_id,
  bank_account_holder,
  public.mask_account(bank_account_number) AS bank_account_number,
  public.mask_account(bank_swift_bic) AS bank_swift_bic,
  bank_name, bank_country,
  public.mask_account(bank_routing_number) AS bank_routing_number,
  created_at, updated_at
FROM public.user_payment_details;

-- Seller payouts safe view (hides internal transfer IDs from sellers)
CREATE OR REPLACE VIEW public.seller_payouts_safe AS
SELECT
  id, seller_id, store_id, amount, status,
  processed_at, processed_by, notes, created_at,
  funding_status, funding_requested_at, completed_at,
  failure_reason, auto_processed, payout_method, paypal_email
FROM public.seller_payouts;

-- Affiliate payouts safe view (hides Stripe internals from users)
CREATE OR REPLACE VIEW public.affiliate_payouts_safe AS
SELECT
  id, user_id, amount, status, payout_method, paypal_email,
  processed_at, notes, created_at
FROM public.affiliate_payouts;

-- =============================================
-- 4. RLS Policy Updates
-- =============================================

-- 4a. Audit logs — add SELECT policy scoped to view_audit_logs
CREATE POLICY "Staff with view_audit_logs can read"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'view_audit_logs'));

-- 4b. Data audit log — replace is_staff with has_permission
DROP POLICY IF EXISTS "Staff can view audit logs" ON public.data_audit_log;
CREATE POLICY "Staff with view_audit_logs can view"
  ON public.data_audit_log FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'view_audit_logs'));

-- 4c. Contact messages — replace is_staff with has_permission('manage_support')
DROP POLICY IF EXISTS "Staff can view contact messages" ON public.contact_messages;
CREATE POLICY "Staff with manage_support can view"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_support'));

DROP POLICY IF EXISTS "Staff can update contact messages" ON public.contact_messages;
CREATE POLICY "Staff with manage_support can update"
  ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_support'));

DROP POLICY IF EXISTS "Staff can delete contact messages" ON public.contact_messages;
CREATE POLICY "Staff with manage_support can delete"
  ON public.contact_messages FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_support'));

-- 4d. Seller webhooks — replace is_staff with has_permission
DROP POLICY IF EXISTS "Staff can view all webhooks" ON public.seller_webhooks;
CREATE POLICY "Staff with manage_seller_stores can view webhooks"
  ON public.seller_webhooks FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_seller_stores'));

-- 4e. Store payment details — replace manage_seller_stores with manage_payouts
DROP POLICY IF EXISTS "Staff with permission can view store payment details" ON public.store_payment_details;
CREATE POLICY "Staff with manage_payouts can view store payment details"
  ON public.store_payment_details FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_payouts'));

-- =============================================
-- 5. Storage path ownership enforcement
-- =============================================

-- Chat attachments — enforce path ownership for authenticated users
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Forum images — enforce path ownership
DROP POLICY IF EXISTS "Authenticated users can upload forum images" ON storage.objects;
CREATE POLICY "Authenticated users can upload forum images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forum-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- =============================================
-- 6. Password reset codes — hash with bcrypt
-- =============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.password_reset_codes ADD COLUMN IF NOT EXISTS code_hash text;

-- Backfill existing codes
UPDATE public.password_reset_codes
SET code_hash = crypt(code, gen_salt('bf'))
WHERE code_hash IS NULL AND code IS NOT NULL;

-- Drop plaintext column
ALTER TABLE public.password_reset_codes DROP COLUMN IF EXISTS code;
