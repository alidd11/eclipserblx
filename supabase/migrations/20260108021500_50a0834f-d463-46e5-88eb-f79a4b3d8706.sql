-- Add unique constraint on display_name (case-insensitive)
CREATE UNIQUE INDEX idx_profiles_display_name_unique ON public.profiles (LOWER(display_name)) WHERE display_name IS NOT NULL;

-- Create a function to check if username is available
CREATE OR REPLACE FUNCTION public.is_username_available(username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(display_name) = LOWER(username)
  );
$$;