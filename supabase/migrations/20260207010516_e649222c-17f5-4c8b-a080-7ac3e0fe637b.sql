-- Add funding tracking columns to seller_payouts
ALTER TABLE public.seller_payouts
ADD COLUMN IF NOT EXISTS funding_status TEXT,
ADD COLUMN IF NOT EXISTS stripe_funding_payout_id TEXT,
ADD COLUMN IF NOT EXISTS funding_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Note: wise_transfer_id and wise_quote_id may already exist from previous migration
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_payouts' AND column_name = 'wise_transfer_id') THEN
    ALTER TABLE public.seller_payouts ADD COLUMN wise_transfer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_payouts' AND column_name = 'wise_quote_id') THEN
    ALTER TABLE public.seller_payouts ADD COLUMN wise_quote_id TEXT;
  END IF;
END $$;

-- Create funding requests tracking table
CREATE TABLE IF NOT EXISTS public.wise_funding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payout_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  linked_payout_ids UUID[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wise_funding_requests ENABLE ROW LEVEL SECURITY;

-- Only staff can access funding requests
CREATE POLICY "Staff can view funding requests"
ON public.wise_funding_requests FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert funding requests"
ON public.wise_funding_requests FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update funding requests"
ON public.wise_funding_requests FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_wise_funding_requests_updated_at
BEFORE UPDATE ON public.wise_funding_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();