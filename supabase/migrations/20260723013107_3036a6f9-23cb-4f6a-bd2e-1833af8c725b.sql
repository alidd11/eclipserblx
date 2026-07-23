
UPDATE auth.users SET email_confirmed_at = now()
WHERE id = 'f84848ae-6fd7-473b-9346-0597133b9a2e';

INSERT INTO public.user_roles (user_id, role, hierarchy_level)
VALUES ('f84848ae-6fd7-473b-9346-0597133b9a2e', 'seller', 50)
ON CONFLICT DO NOTHING;

INSERT INTO public.stores (
  id, owner_id, store_id, name, slug, status, is_active,
  payout_method, is_testing, pwyw_enabled, leak_scan_enabled,
  commission_rate, description
) VALUES (
  gen_random_uuid(), 'f84848ae-6fd7-473b-9346-0597133b9a2e',
  'qa-seller-' || substr(md5(random()::text), 1, 8),
  'QA Seller Store', 'qa-seller-store-fa80193b',
  'approved', true, 'stripe', true, false, false, 10.00,
  'Throwaway QA store'
);

INSERT INTO public.products (
  id, name, slug, price, store_id, is_active, moderation_status,
  is_resellable, ip_ownership_confirmed, delivery_type, is_pay_what_you_want,
  is_seller_product, early_access_strategy, description, asset_file_url
)
SELECT gen_random_uuid(), 'QA Test Product', 'qa-test-product-fa80193b',
  9.99, s.id, true, 'approved', false, true, 'file', false, true, 'none',
  'Throwaway QA product for dashboard sweep', 'https://example.com/qa.zip'
FROM public.stores s WHERE s.owner_id = 'f84848ae-6fd7-473b-9346-0597133b9a2e' LIMIT 1;
