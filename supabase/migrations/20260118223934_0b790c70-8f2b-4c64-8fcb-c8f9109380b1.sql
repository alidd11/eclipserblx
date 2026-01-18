-- Add Roblox linking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS roblox_user_id text,
ADD COLUMN IF NOT EXISTS roblox_username text;