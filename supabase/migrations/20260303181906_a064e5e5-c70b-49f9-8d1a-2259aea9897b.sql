-- Create a security definer function to return public homepage stats
-- This allows anonymous users to get aggregate counts without direct table access
CREATE OR REPLACE FUNCTION public.get_homepage_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'products_count', (
      SELECT count(*) FROM products 
      WHERE is_active = true 
      AND (release_at IS NULL OR release_at <= now())
    ),
    'downloads_count', (
      SELECT count(*) FROM download_logs
    ),
    'users_count', (
      SELECT count(*) FROM profiles p
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = p.user_id 
        AND ur.role NOT IN ('eclipse_plus_member', 'seller', 'customer')
      )
    )
  );
$$;