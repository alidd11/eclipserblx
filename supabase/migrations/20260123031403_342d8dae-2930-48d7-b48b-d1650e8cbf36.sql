-- Add is_testing column to stores table for hiding stores from non-admins
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_testing boolean NOT NULL DEFAULT false;

-- Add marketplace_public setting
INSERT INTO public.settings (key, value) 
VALUES ('marketplace_public', 'false')
ON CONFLICT (key) DO NOTHING;

-- Update Eclipse Store to testing mode
UPDATE public.stores SET is_testing = true WHERE id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a';