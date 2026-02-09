
-- Create table for storing product translations
CREATE TABLE public.product_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  translated_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, language_code)
);

-- Enable RLS
ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;

-- Anyone can read translations
CREATE POLICY "Translations are publicly readable"
  ON public.product_translations
  FOR SELECT
  USING (true);

-- Only service role inserts/updates (via edge function)
CREATE POLICY "Service role can manage translations"
  ON public.product_translations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_product_translations_product_lang 
  ON public.product_translations(product_id, language_code);

-- Trigger for updated_at
CREATE TRIGGER update_product_translations_updated_at
  BEFORE UPDATE ON public.product_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
