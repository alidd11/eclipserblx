-- Create product_imports table to track import history and detect duplicates
CREATE TABLE public.product_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_price NUMERIC(10,2),
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  imported_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'skipped')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Unique constraint to prevent duplicate imports of the same source URL per store
CREATE UNIQUE INDEX idx_product_imports_unique_source ON public.product_imports(store_id, source_url) WHERE status = 'completed';

-- Index for querying import history
CREATE INDEX idx_product_imports_store ON public.product_imports(store_id, imported_at DESC);

-- Enable RLS
ALTER TABLE public.product_imports ENABLE ROW LEVEL SECURITY;

-- Policy: Sellers can view their own import history
CREATE POLICY "Sellers can view own imports"
  ON public.product_imports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = product_imports.store_id AND stores.owner_id = auth.uid()
    )
  );

-- Policy: Sellers can insert their own imports
CREATE POLICY "Sellers can create imports"
  ON public.product_imports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = product_imports.store_id AND stores.owner_id = auth.uid()
    )
    AND imported_by = auth.uid()
  );

-- Policy: Staff can view all imports
CREATE POLICY "Staff can view all imports"
  ON public.product_imports
  FOR SELECT
  USING (public.is_staff(auth.uid()));

-- Add comment
COMMENT ON TABLE public.product_imports IS 'Tracks products imported from external platforms for history and duplicate detection';