-- Add evidence column to global_bans table for storing evidence attachments
ALTER TABLE public.global_bans 
ADD COLUMN IF NOT EXISTS evidence jsonb DEFAULT '[]'::jsonb;

-- Add updated_at column if not exists
ALTER TABLE public.global_bans 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_global_bans_evidence ON public.global_bans USING gin(evidence) WHERE evidence IS NOT NULL AND evidence != '[]'::jsonb;