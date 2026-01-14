-- Add Discord linking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS discord_id text,
ADD COLUMN IF NOT EXISTS discord_username text;

-- Add index for Discord ID lookups
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id) WHERE discord_id IS NOT NULL;

-- Add constraint to ensure discord_id format (17-19 digit snowflake)
ALTER TABLE public.profiles 
ADD CONSTRAINT discord_id_format CHECK (
  discord_id IS NULL OR discord_id ~ '^\d{17,19}$'
);