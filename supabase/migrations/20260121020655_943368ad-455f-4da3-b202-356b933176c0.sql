-- Add is_trusted column to stores table for Trusted Seller badge
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT false;