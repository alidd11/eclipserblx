-- Add release_notified_at column to track which scheduled products have been processed
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS release_notified_at TIMESTAMPTZ;