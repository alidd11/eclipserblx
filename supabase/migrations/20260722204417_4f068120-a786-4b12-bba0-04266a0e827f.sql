DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email='qa-admin-verify+a9895032@eclipserblx.com');
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email='qa-admin-verify+a9895032@eclipserblx.com');
DELETE FROM auth.users WHERE email='qa-admin-verify+a9895032@eclipserblx.com';