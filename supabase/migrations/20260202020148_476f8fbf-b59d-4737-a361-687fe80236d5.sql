-- Add column to products table for Eclipse+ free claim eligibility
ALTER TABLE public.products 
ADD COLUMN eclipse_free_eligible boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.products.eclipse_free_eligible IS 'Whether this product can be claimed for free by Eclipse+ members';

-- Create index for filtering
CREATE INDEX idx_products_eclipse_free_eligible ON public.products(eclipse_free_eligible) WHERE eclipse_free_eligible = true;