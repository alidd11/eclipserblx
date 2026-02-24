-- Add external link delivery support for products like website templates
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS external_link TEXT,
ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'file' CHECK (delivery_type IN ('file', 'external_link', 'both'));

-- Add a comment for clarity
COMMENT ON COLUMN public.products.external_link IS 'External URL for template delivery (e.g., GitHub, Figma, etc.)';
COMMENT ON COLUMN public.products.delivery_type IS 'How the product is delivered: file upload, external link, or both';