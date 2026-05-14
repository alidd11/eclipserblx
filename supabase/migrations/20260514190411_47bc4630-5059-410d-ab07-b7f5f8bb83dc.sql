DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'has_role(uuid, text)',
    'has_permission(uuid, text)',
    'has_store_access(uuid, uuid)',
    'is_staff(uuid)',
    'is_store_owner(uuid, uuid)',
    'is_store_team_member(uuid, uuid)',
    'has_premium_global_guard(uuid)',
    'auth_user_exists(uuid)',
    'product_file_review_consented(uuid)',
    'user_has_purchased_product(uuid, uuid)',
    'get_user_max_hierarchy(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing function: %', fn;
    WHEN others THEN
      RAISE NOTICE 'skip %: %', fn, SQLERRM;
    END;
  END LOOP;
END $$;