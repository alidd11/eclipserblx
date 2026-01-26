-- Add max_images column to advertisement_tiers
ALTER TABLE public.advertisement_tiers 
ADD COLUMN max_images integer NOT NULL DEFAULT 1;

-- Update existing tiers with appropriate image limits
UPDATE public.advertisement_tiers SET max_images = 3 WHERE tier = 'basic';
UPDATE public.advertisement_tiers SET max_images = 5 WHERE tier = 'pro';
UPDATE public.advertisement_tiers SET max_images = 10 WHERE tier = 'premium';