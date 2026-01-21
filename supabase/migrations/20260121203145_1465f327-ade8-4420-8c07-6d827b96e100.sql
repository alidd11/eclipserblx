-- Add roblox_url field to stores table for individual store owners
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS roblox_url TEXT;