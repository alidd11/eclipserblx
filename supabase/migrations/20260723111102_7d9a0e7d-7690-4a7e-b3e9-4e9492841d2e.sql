
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  seller_id uuid := gen_random_uuid();
  store_uuid uuid := gen_random_uuid();
  product_uuid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user)
  VALUES (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qa-verify+c1ad074e@eclipserblx.com', crypt('ywwhTggHDCJa5Ll1TLiT', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false);
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), admin_id, admin_id::text, jsonb_build_object('sub', admin_id::text, 'email', 'qa-verify+c1ad074e@eclipserblx.com', 'email_verified', true), 'email', now(), now(), now());
  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user)
  VALUES (seller_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qa-seller+74f6b4fd@eclipserblx.com', crypt('IA1jj5290lc4pvCpDrVW', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false);
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), seller_id, seller_id::text, jsonb_build_object('sub', seller_id::text, 'email', 'qa-seller+74f6b4fd@eclipserblx.com', 'email_verified', true), 'email', now(), now(), now());
  INSERT INTO public.user_roles (user_id, role) VALUES (seller_id, 'seller');

  INSERT INTO public.stores (id, owner_id, store_id, name, slug, payout_method, is_testing, pwyw_enabled, leak_scan_enabled, status)
  VALUES (store_uuid, seller_id, 'qa-verify-store-' || substr(store_uuid::text,1,8), 'QA Verify Store', 'qa-verify-store-' || substr(store_uuid::text,1,8), 'stripe', true, false, false, 'approved');

  INSERT INTO public.products (id, name, slug, price, store_id, is_active, is_resellable, ip_ownership_confirmed, delivery_type, is_pay_what_you_want, early_access_strategy, is_seller_product, moderation_status, product_number)
  VALUES (product_uuid, 'QA Verify Pending Product', 'qa-verify-pending-' || substr(product_uuid::text,1,8), 5.00, store_uuid, false, false, true, 'file', false, 'none', true, 'pending', (SELECT COALESCE(MAX(product_number),0)+1 FROM public.products));

  RAISE NOTICE 'admin=% seller=% product=%', admin_id, seller_id, product_uuid;
END $$;
