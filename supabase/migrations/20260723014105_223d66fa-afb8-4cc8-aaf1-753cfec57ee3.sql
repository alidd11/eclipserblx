
DO $$
DECLARE u uuid;
BEGIN
  SELECT id INTO u FROM auth.users WHERE email = 'qa-seller-verify+fa80193b@eclipserblx.com';
  IF u IS NOT NULL THEN
    DELETE FROM public.products WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = u);
    DELETE FROM public.store_payment_details WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = u);
    DELETE FROM public.stores WHERE owner_id = u;
    DELETE FROM public.user_roles WHERE user_id = u;
    DELETE FROM public.profiles WHERE id = u;
    DELETE FROM auth.identities WHERE user_id = u;
    DELETE FROM auth.users WHERE id = u;
  END IF;
END $$;
