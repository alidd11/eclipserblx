-- Add scheduled_for column for Pro+ ad scheduling
ALTER TABLE public.discord_advertisements
ADD COLUMN scheduled_for timestamp with time zone DEFAULT NULL;

-- Add index for efficient querying of scheduled ads
CREATE INDEX idx_discord_advertisements_scheduled_for 
ON public.discord_advertisements(scheduled_for) 
WHERE scheduled_for IS NOT NULL AND status = 'scheduled';

-- Comment for documentation
COMMENT ON COLUMN public.discord_advertisements.scheduled_for IS 'When the ad should be automatically posted. Pro+ feature only.';