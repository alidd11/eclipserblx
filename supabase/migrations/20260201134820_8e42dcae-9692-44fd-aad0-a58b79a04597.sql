-- Create store_categories junction table to track which categories are enabled per store
CREATE TABLE public.store_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, category_id)
);

-- Enable RLS
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

-- Public can view enabled categories for any store
CREATE POLICY "Anyone can view enabled store categories"
ON public.store_categories
FOR SELECT
USING (is_enabled = true);

-- Store owners can manage their own categories
CREATE POLICY "Store owners can manage their categories"
ON public.store_categories
FOR ALL
USING (public.is_store_owner(store_id, auth.uid()))
WITH CHECK (public.is_store_owner(store_id, auth.uid()));

-- Store team members with manager role can manage categories
CREATE POLICY "Store team can manage categories"
ON public.store_categories
FOR ALL
USING (public.is_store_team_member(store_id, auth.uid(), ARRAY['manager']::store_team_role[]))
WITH CHECK (public.is_store_team_member(store_id, auth.uid(), ARRAY['manager']::store_team_role[]));

-- Create trigger for updated_at
CREATE TRIGGER update_store_categories_updated_at
BEFORE UPDATE ON public.store_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_store_categories_store_id ON public.store_categories(store_id);
CREATE INDEX idx_store_categories_category_id ON public.store_categories(category_id);