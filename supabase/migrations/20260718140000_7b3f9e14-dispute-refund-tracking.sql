-- Track whether an approved dispute's refund was actually processed with
-- Stripe. Previously "approved" only updated refund_requests.status and
-- told the customer "your refund will be processed" — no money ever moved.
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE;
