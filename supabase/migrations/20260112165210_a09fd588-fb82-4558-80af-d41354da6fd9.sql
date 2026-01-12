-- Add columns to reviews table for external/manual reviews
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS external_source text,
ADD COLUMN IF NOT EXISTS external_reviewer_name text;