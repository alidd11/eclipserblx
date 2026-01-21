-- Add about_content column to stores table for rich text about page content
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS about_content TEXT;