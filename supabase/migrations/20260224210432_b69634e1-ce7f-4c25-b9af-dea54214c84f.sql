
-- Add filing method tracking to takedown requests
ALTER TABLE public.takedown_requests 
  ADD COLUMN IF NOT EXISTS filing_method text DEFAULT 'self' CHECK (filing_method IN ('self', 'agent')),
  ADD COLUMN IF NOT EXISTS dmca_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS dmca_sent_to_email text,
  ADD COLUMN IF NOT EXISTS agent_authorization boolean DEFAULT false;
