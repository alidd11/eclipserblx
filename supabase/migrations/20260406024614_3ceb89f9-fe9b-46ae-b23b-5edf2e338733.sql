
-- Create leak_scan_results table
CREATE TABLE public.leak_scan_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  matched_query TEXT NOT NULL,
  snippet TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium',
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate URLs per product
CREATE UNIQUE INDEX idx_leak_scan_results_url ON public.leak_scan_results (product_id, source_url);

-- Index for store lookups
CREATE INDEX idx_leak_scan_results_store ON public.leak_scan_results (store_id, dismissed, created_at DESC);

-- Enable RLS
ALTER TABLE public.leak_scan_results ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own store's results
CREATE POLICY "Sellers can view own leak scan results"
ON public.leak_scan_results
FOR SELECT
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

-- Sellers can dismiss their own results
CREATE POLICY "Sellers can update own leak scan results"
ON public.leak_scan_results
FOR UPDATE
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
);

-- Service role can insert (edge function)
CREATE POLICY "Service role can insert leak scan results"
ON public.leak_scan_results
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add leak_scan_enabled to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS leak_scan_enabled BOOLEAN NOT NULL DEFAULT false;
