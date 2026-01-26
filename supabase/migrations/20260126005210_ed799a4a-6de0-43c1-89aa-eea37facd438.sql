-- Add is_resellable column to products table (defaults to false)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_resellable BOOLEAN NOT NULL DEFAULT false;