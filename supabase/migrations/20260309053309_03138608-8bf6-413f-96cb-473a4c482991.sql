-- Add store_id to store_domain_billing for easier lookups
ALTER TABLE public.store_domain_billing 
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Make store_domain_id nullable (billing can exist before domain is added)
ALTER TABLE public.store_domain_billing ALTER COLUMN store_domain_id DROP NOT NULL;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_store_domain_billing_store_id ON public.store_domain_billing(store_id);
CREATE INDEX IF NOT EXISTS idx_store_domain_billing_status ON public.store_domain_billing(status);