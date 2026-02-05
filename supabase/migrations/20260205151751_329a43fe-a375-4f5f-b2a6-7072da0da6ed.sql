-- Add moderation_flags column to track security scan results
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS moderation_flags JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.moderation_flags IS 'Stores security scan results: {nsfw_flags: [], lua_risk_level: string, lua_concerns: [], scan_timestamp: string}';