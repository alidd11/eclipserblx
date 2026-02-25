
-- Add claimant contact fields to takedown_requests for DMCA compliance
ALTER TABLE public.takedown_requests
ADD COLUMN IF NOT EXISTS claimant_name TEXT,
ADD COLUMN IF NOT EXISTS claimant_email TEXT,
ADD COLUMN IF NOT EXISTS claimant_address TEXT;
