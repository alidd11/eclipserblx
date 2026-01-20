-- Add social links columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS discord_url text,
ADD COLUMN IF NOT EXISTS twitter_url text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS tiktok_url text,
ADD COLUMN IF NOT EXISTS website_url text;