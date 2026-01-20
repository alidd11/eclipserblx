-- Add customization columns to stores table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS bio TEXT;