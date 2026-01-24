-- Fix the is_username_available function to check the correct column
CREATE OR REPLACE FUNCTION public.is_username_available(username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE LOWER(p.username) = LOWER(is_username_available.username)
  );
$$;