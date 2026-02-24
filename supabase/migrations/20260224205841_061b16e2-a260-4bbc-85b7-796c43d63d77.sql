
-- Add columns to ip_copy_detections for group verification and history
ALTER TABLE public.ip_copy_detections 
  ADD COLUMN IF NOT EXISTS creator_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_group_id text,
  ADD COLUMN IF NOT EXISTS creator_group_name text,
  ADD COLUMN IF NOT EXISTS first_detected_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS previous_player_count integer,
  ADD COLUMN IF NOT EXISTS player_count_trend text DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS detection_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS takedown_request_id uuid REFERENCES public.takedown_requests(id);

-- Create detection history/snapshots table
CREATE TABLE IF NOT EXISTS public.ip_detection_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  detection_id uuid NOT NULL REFERENCES public.ip_copy_detections(id) ON DELETE CASCADE,
  player_count integer DEFAULT 0,
  similarity_score integer DEFAULT 0,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_detection_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own detection snapshots"
  ON public.ip_detection_snapshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ip_copy_detections d 
    WHERE d.id = detection_id AND d.creator_id = auth.uid()
  ));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_detection_snapshots_detection_id ON public.ip_detection_snapshots(detection_id);
CREATE INDEX IF NOT EXISTS idx_detection_snapshots_snapshot_at ON public.ip_detection_snapshots(snapshot_at);
