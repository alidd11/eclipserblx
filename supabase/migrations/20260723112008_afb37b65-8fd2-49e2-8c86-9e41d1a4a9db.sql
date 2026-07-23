
DELETE FROM public.products WHERE name='QA Verify Pending Product';
DELETE FROM public.stores WHERE name='QA Verify Store';
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('qa-verify+c1ad074e@eclipserblx.com','qa-seller+74f6b4fd@eclipserblx.com'));
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('qa-verify+c1ad074e@eclipserblx.com','qa-seller+74f6b4fd@eclipserblx.com'));
DELETE FROM auth.users WHERE email IN ('qa-verify+c1ad074e@eclipserblx.com','qa-seller+74f6b4fd@eclipserblx.com');
