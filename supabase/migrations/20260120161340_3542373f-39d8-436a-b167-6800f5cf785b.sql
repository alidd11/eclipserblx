-- Create table for seller store tabs (product category filters)
CREATE TABLE public.store_tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT, -- Lucide icon name
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, slug)
);

-- Create junction table to link products to tabs
CREATE TABLE public.store_tab_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tab_id UUID NOT NULL REFERENCES public.store_tabs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tab_id, product_id)
);

-- Add indexes for performance
CREATE INDEX idx_store_tabs_store_id ON public.store_tabs(store_id);
CREATE INDEX idx_store_tabs_display_order ON public.store_tabs(store_id, display_order);
CREATE INDEX idx_store_tab_products_tab_id ON public.store_tab_products(tab_id);
CREATE INDEX idx_store_tab_products_product_id ON public.store_tab_products(product_id);

-- Enable RLS
ALTER TABLE public.store_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_tab_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for store_tabs
-- Public can view active tabs for active stores
CREATE POLICY "Anyone can view active tabs"
ON public.store_tabs
FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_tabs.store_id 
    AND stores.is_active = true 
    AND stores.status = 'approved'
  )
);

-- Store owners can manage their own tabs
CREATE POLICY "Store owners can manage tabs"
ON public.store_tabs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_tabs.store_id 
    AND stores.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_tabs.store_id 
    AND stores.owner_id = auth.uid()
  )
);

-- Admins have full access
CREATE POLICY "Admins can manage all tabs"
ON public.store_tabs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for store_tab_products
-- Public can view tab products for active tabs
CREATE POLICY "Anyone can view tab products"
ON public.store_tab_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_tabs
    JOIN public.stores ON stores.id = store_tabs.store_id
    WHERE store_tabs.id = store_tab_products.tab_id
    AND store_tabs.is_active = true
    AND stores.is_active = true
    AND stores.status = 'approved'
  )
);

-- Store owners can manage their tab products
CREATE POLICY "Store owners can manage tab products"
ON public.store_tab_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.store_tabs
    JOIN public.stores ON stores.id = store_tabs.store_id
    WHERE store_tabs.id = store_tab_products.tab_id
    AND stores.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_tabs
    JOIN public.stores ON stores.id = store_tabs.store_id
    WHERE store_tabs.id = store_tab_products.tab_id
    AND stores.owner_id = auth.uid()
  )
);

-- Admins have full access to tab products
CREATE POLICY "Admins can manage all tab products"
ON public.store_tab_products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_store_tabs_updated_at
BEFORE UPDATE ON public.store_tabs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();