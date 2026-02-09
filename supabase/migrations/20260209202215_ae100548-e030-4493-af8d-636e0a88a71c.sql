-- Create category_translations table (same pattern as product_translations)
CREATE TABLE public.category_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  translated_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, language_code)
);

-- Enable RLS
ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Category translations are publicly readable"
  ON public.category_translations
  FOR SELECT
  USING (true);

-- Only service role can write (edge functions)
CREATE POLICY "Only service role can insert category translations"
  ON public.category_translations
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update category translations"
  ON public.category_translations
  FOR UPDATE
  USING (false);

-- Index for fast lookups
CREATE INDEX idx_category_translations_lookup ON public.category_translations(category_id, language_code);