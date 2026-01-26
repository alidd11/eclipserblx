-- Create advertisement analytics table for click tracking
CREATE TABLE public.advertisement_clicks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES public.discord_advertisements(id) ON DELETE CASCADE,
    clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    visitor_id TEXT,
    referrer TEXT,
    user_agent TEXT,
    device_type TEXT,
    country TEXT
);

-- Create index for faster queries
CREATE INDEX idx_ad_clicks_advertisement_id ON public.advertisement_clicks(advertisement_id);
CREATE INDEX idx_ad_clicks_clicked_at ON public.advertisement_clicks(clicked_at);

-- Enable RLS
ALTER TABLE public.advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for click tracking from redirect)
CREATE POLICY "Anyone can record ad clicks"
ON public.advertisement_clicks
FOR INSERT
WITH CHECK (true);

-- Users can view clicks for their own ads
CREATE POLICY "Users can view their own ad clicks"
ON public.advertisement_clicks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.discord_advertisements da
        WHERE da.id = advertisement_id
        AND da.user_id = auth.uid()
    )
);

-- Staff can view all clicks
CREATE POLICY "Staff can view all ad clicks"
ON public.advertisement_clicks
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Add click tracking columns to discord_advertisements
ALTER TABLE public.discord_advertisements
ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMP WITH TIME ZONE;

-- Enable realtime for clicks (for live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.advertisement_clicks;