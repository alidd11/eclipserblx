-- =====================================================
-- SECURITY HARDENING: Retarget all sensitive table RLS
-- policies from 'public' role to 'authenticated' role
-- =====================================================

-- ============ ADVERTISEMENT_SUBSCRIPTIONS ============
DROP POLICY IF EXISTS "Staff can manage all subscriptions" ON public.advertisement_subscriptions;
DROP POLICY IF EXISTS "Staff can view all subscriptions" ON public.advertisement_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.advertisement_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.advertisement_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.advertisement_subscriptions;

CREATE POLICY "Staff can manage all subscriptions" ON public.advertisement_subscriptions FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Users can insert their own subscription" ON public.advertisement_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.advertisement_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own subscription" ON public.advertisement_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ AFFILIATE_BALANCES ============
DROP POLICY IF EXISTS "Only triggers can insert balances" ON public.affiliate_balances;
DROP POLICY IF EXISTS "Only triggers can update balances" ON public.affiliate_balances;
DROP POLICY IF EXISTS "Staff can manage balances" ON public.affiliate_balances;
DROP POLICY IF EXISTS "Staff can update balances" ON public.affiliate_balances;
DROP POLICY IF EXISTS "Staff can view all affiliate balances" ON public.affiliate_balances;
DROP POLICY IF EXISTS "Staff can view all balances" ON public.affiliate_balances;
DROP POLICY IF EXISTS "Users can view own affiliate balance" ON public.affiliate_balances;
DROP POLICY IF EXISTS "Users can view their own balance" ON public.affiliate_balances;

CREATE POLICY "Staff can manage aff balances" ON public.affiliate_balances FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Users can view own aff balance" ON public.affiliate_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ AFFILIATE_PAYOUTS ============
DROP POLICY IF EXISTS "Staff can update payouts" ON public.affiliate_payouts;
DROP POLICY IF EXISTS "Staff can view all payouts" ON public.affiliate_payouts;
DROP POLICY IF EXISTS "Users can request payouts" ON public.affiliate_payouts;
DROP POLICY IF EXISTS "Users can view their own payouts" ON public.affiliate_payouts;

CREATE POLICY "Staff can manage aff payouts" ON public.affiliate_payouts FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Users can request aff payouts" ON public.affiliate_payouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own aff payouts" ON public.affiliate_payouts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ BOT_INSTALLATION_CODES ============
DROP POLICY IF EXISTS "Staff can update installation codes" ON public.bot_installation_codes;
DROP POLICY IF EXISTS "Staff can view all installation codes" ON public.bot_installation_codes;
DROP POLICY IF EXISTS "Users can view activated status of their codes" ON public.bot_installation_codes;
DROP POLICY IF EXISTS "Users can view their own installation codes" ON public.bot_installation_codes;

CREATE POLICY "Staff can manage installation codes" ON public.bot_installation_codes FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Users can view own codes" ON public.bot_installation_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ DISCORD_LINK_CODES ============
DROP POLICY IF EXISTS "Users can create own link codes" ON public.discord_link_codes;
DROP POLICY IF EXISTS "Users can update own link codes" ON public.discord_link_codes;
DROP POLICY IF EXISTS "Users can view own link codes" ON public.discord_link_codes;

CREATE POLICY "Auth users can create link codes" ON public.discord_link_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users can update link codes" ON public.discord_link_codes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Auth users can view link codes" ON public.discord_link_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ DOWNLOAD_TOKENS ============
DROP POLICY IF EXISTS "Service role manages download tokens" ON public.download_tokens;
CREATE POLICY "Service role manages download tokens" ON public.download_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can view own download tokens" ON public.download_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ EMAIL_SUBSCRIPTIONS ============
DROP POLICY IF EXISTS "Staff can view all subscriptions" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.email_subscriptions;

CREATE POLICY "Staff can view all email subs" ON public.email_subscriptions FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Users can insert own email sub" ON public.email_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own email sub" ON public.email_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own email sub" ON public.email_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ GLOBAL_GUARD_SUBSCRIPTIONS ============
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.global_guard_subscriptions;
CREATE POLICY "Users can view own gg sub" ON public.global_guard_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all gg subs" ON public.global_guard_subscriptions FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- ============ IDENTITY_VERIFICATIONS ============
DROP POLICY IF EXISTS "Service role can manage verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can view own verifications" ON public.identity_verifications;

CREATE POLICY "Users can manage own verifications" ON public.identity_verifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can view verifications" ON public.identity_verifications FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Service role manages verifications" ON public.identity_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ ORDER_ITEMS ============
DROP POLICY IF EXISTS "Sellers can view order items for their products" ON public.order_items;
DROP POLICY IF EXISTS "Staff can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create items for their own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;

CREATE POLICY "Staff can view all order items" ON public.order_items FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'view_orders'));
CREATE POLICY "Sellers view order items for products" ON public.order_items FOR SELECT TO authenticated USING (seller_owns_order_item_product(auth.uid(), product_id));
CREATE POLICY "Users create items for own orders" ON public.order_items FOR INSERT TO authenticated WITH CHECK (user_can_insert_order_item(auth.uid(), order_id));
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT TO authenticated USING (user_owns_order(auth.uid(), order_id));

-- ============ ORDERS ============
DROP POLICY IF EXISTS "Owner can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Staff can view all orders" ON public.orders FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'view_orders'));
CREATE POLICY "Staff can manage orders" ON public.orders FOR ALL TO authenticated USING (has_permission(auth.uid(), 'manage_orders'));
CREATE POLICY "Sellers view orders with their products" ON public.orders FOR SELECT TO authenticated USING (seller_has_products_in_order(auth.uid(), id));
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'manage_users'));

-- ============ SELLER_BALANCES ============
DROP POLICY IF EXISTS "Sellers can view own balance" ON public.seller_balances;
DROP POLICY IF EXISTS "Staff can manage balances" ON public.seller_balances;
DROP POLICY IF EXISTS "Staff can view all balances" ON public.seller_balances;

CREATE POLICY "Staff can manage seller balances" ON public.seller_balances FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Sellers view own balance" ON public.seller_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ SELLER_PAYOUTS ============
DROP POLICY IF EXISTS "Sellers can request payouts" ON public.seller_payouts;
DROP POLICY IF EXISTS "Sellers can view own payouts" ON public.seller_payouts;
DROP POLICY IF EXISTS "Staff can manage payouts" ON public.seller_payouts;
DROP POLICY IF EXISTS "Staff can view all payouts" ON public.seller_payouts;

CREATE POLICY "Staff can manage seller payouts" ON public.seller_payouts FOR ALL TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Sellers request payouts" ON public.seller_payouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers view own payouts" ON public.seller_payouts FOR SELECT TO authenticated USING (auth.uid() = seller_id);

-- ============ STORE_CREDENTIALS ============
DROP POLICY IF EXISTS "Owners can insert own store credentials" ON public.store_credentials;
DROP POLICY IF EXISTS "Owners can update own store credentials" ON public.store_credentials;
DROP POLICY IF EXISTS "Owners can view own store credentials" ON public.store_credentials;

CREATE POLICY "Owners insert own store creds" ON public.store_credentials FOR INSERT TO authenticated WITH CHECK (is_store_owner(store_id, auth.uid()));
CREATE POLICY "Owners update own store creds" ON public.store_credentials FOR UPDATE TO authenticated USING (is_store_owner(store_id, auth.uid()));
CREATE POLICY "Owners view own store creds" ON public.store_credentials FOR SELECT TO authenticated USING (is_store_owner(store_id, auth.uid()));
CREATE POLICY "Staff view store creds" ON public.store_credentials FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- ============ STORE_PAYMENT_DETAILS ============
DROP POLICY IF EXISTS "Owners can insert own payment details" ON public.store_payment_details;
DROP POLICY IF EXISTS "Owners can update own payment details" ON public.store_payment_details;
DROP POLICY IF EXISTS "Owners can view own payment details" ON public.store_payment_details;

CREATE POLICY "Owners insert own payment details" ON public.store_payment_details FOR INSERT TO authenticated WITH CHECK (is_store_owner(store_id, auth.uid()));
CREATE POLICY "Owners update own payment details" ON public.store_payment_details FOR UPDATE TO authenticated USING (is_store_owner(store_id, auth.uid()));
CREATE POLICY "Owners view own payment details" ON public.store_payment_details FOR SELECT TO authenticated USING (is_store_owner(store_id, auth.uid()));