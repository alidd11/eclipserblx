
-- Add banner scheduling columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS banner_start_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banner_end_at timestamptz DEFAULT NULL;

-- Create store_custom_sections table for custom store page sections
CREATE TABLE public.store_custom_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for section_type
CREATE OR REPLACE FUNCTION public.validate_section_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.section_type NOT IN ('faq', 'testimonials', 'featured_collection', 'text_block', 'gallery') THEN
    RAISE EXCEPTION 'Invalid section_type: %', NEW.section_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_section_type
  BEFORE INSERT OR UPDATE ON public.store_custom_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_section_type();

-- Enable RLS
ALTER TABLE public.store_custom_sections ENABLE ROW LEVEL SECURITY;

-- Public can view visible sections
CREATE POLICY "Anyone can view visible store sections"
  ON public.store_custom_sections
  FOR SELECT
  USING (is_visible = true);

-- Store owners can manage their sections
CREATE POLICY "Store owners can insert sections"
  ON public.store_custom_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_custom_sections.store_id AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can update their sections"
  ON public.store_custom_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_custom_sections.store_id AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can delete their sections"
  ON public.store_custom_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_custom_sections.store_id AND stores.owner_id = auth.uid()
    )
  );

-- Staff can manage any sections
CREATE POLICY "Staff can manage all sections"
  ON public.store_custom_sections
  FOR ALL
  USING (public.is_staff(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_store_custom_sections_store_id ON public.store_custom_sections(store_id, display_order);

-- Trigger for updated_at
CREATE TRIGGER update_store_custom_sections_updated_at
  BEFORE UPDATE ON public.store_custom_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
