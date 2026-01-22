-- Add username column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (LOWER(username));

-- Migrate existing display_names to usernames for users who don't have one
UPDATE public.profiles 
SET username = display_name 
WHERE username IS NULL AND display_name IS NOT NULL;

-- For any remaining nulls, generate username from email or customer_id
UPDATE public.profiles 
SET username = COALESCE(
  SPLIT_PART(email, '@', 1),
  customer_id,
  'user_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8)
)
WHERE username IS NULL;

-- Make username NOT NULL after populating
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL;

-- Update handle_new_user function to set username on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, email, display_name, username, customer_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        generate_customer_id()
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$function$;