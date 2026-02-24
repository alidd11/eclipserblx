-- Add search_keywords column to creator_ip_registry for copy detection
ALTER TABLE public.creator_ip_registry
ADD COLUMN search_keywords text[] DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.creator_ip_registry.search_keywords IS 'Custom keywords used for Roblox copy detection scanning';

-- Create table for copy detection results
CREATE TABLE public.ip_copy_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registry_entry_id UUID NOT NULL REFERENCES public.creator_ip_registry(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  search_keyword TEXT NOT NULL,
  detected_universe_id TEXT NOT NULL,
  detected_place_id TEXT,
  game_name TEXT NOT NULL,
  game_creator_name TEXT,
  game_creator_id TEXT,
  game_creator_type TEXT,
  player_count INTEGER DEFAULT 0,
  game_thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(registry_entry_id, detected_universe_id)
);

-- Enable RLS
ALTER TABLE public.ip_copy_detections ENABLE ROW LEVEL SECURITY;

-- Users can view their own detections
CREATE POLICY "Users can view own copy detections"
ON public.ip_copy_detections FOR SELECT
USING (auth.uid() = creator_id);

-- Users can update (dismiss) their own detections
CREATE POLICY "Users can update own copy detections"
ON public.ip_copy_detections FOR UPDATE
USING (auth.uid() = creator_id);

-- Service role inserts (via edge function)
CREATE POLICY "Service role can insert copy detections"
ON public.ip_copy_detections FOR INSERT
WITH CHECK (true);

-- Index for lookups
CREATE INDEX idx_copy_detections_creator ON public.ip_copy_detections(creator_id);
CREATE INDEX idx_copy_detections_registry ON public.ip_copy_detections(registry_entry_id);
CREATE INDEX idx_copy_detections_status ON public.ip_copy_detections(status) WHERE status = 'new';