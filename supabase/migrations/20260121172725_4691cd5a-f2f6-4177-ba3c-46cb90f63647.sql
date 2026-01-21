-- Create table to track seller Terms of Service agreements
CREATE TABLE public.seller_agreements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    signed_by UUID NOT NULL,
    agreement_version TEXT NOT NULL DEFAULT '1.0',
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    UNIQUE(store_id, agreement_version)
);

-- Enable RLS
ALTER TABLE public.seller_agreements ENABLE ROW LEVEL SECURITY;

-- Store owners can view their own agreements
CREATE POLICY "Store owners can view their agreements"
ON public.seller_agreements
FOR SELECT
USING (
    public.is_store_owner(store_id, auth.uid())
);

-- Store owners can sign agreements
CREATE POLICY "Store owners can sign agreements"
ON public.seller_agreements
FOR INSERT
WITH CHECK (
    public.is_store_owner(store_id, auth.uid())
);

-- Staff can view all agreements
CREATE POLICY "Staff can view all agreements"
ON public.seller_agreements
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Add index for common queries
CREATE INDEX idx_seller_agreements_store_id ON public.seller_agreements(store_id);
CREATE INDEX idx_seller_agreements_signed_at ON public.seller_agreements(signed_at DESC);