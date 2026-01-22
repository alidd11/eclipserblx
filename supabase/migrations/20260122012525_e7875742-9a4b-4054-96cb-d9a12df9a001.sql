-- Add parent_id column to categories table for subcategory support
ALTER TABLE public.categories 
ADD COLUMN parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for efficient parent-child queries
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);