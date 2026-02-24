
-- Add comprehensive evidence collection columns to ip_copy_detections
ALTER TABLE public.ip_copy_detections 
  ADD COLUMN IF NOT EXISTS evidence_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_screenshots text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS game_badges_count integer,
  ADD COLUMN IF NOT EXISTS game_passes_count integer,
  ADD COLUMN IF NOT EXISTS game_favorites integer,
  ADD COLUMN IF NOT EXISTS game_visits bigint,
  ADD COLUMN IF NOT EXISTS game_genre text,
  ADD COLUMN IF NOT EXISTS game_updated_at text;

-- Add index for faster evidence queries
CREATE INDEX IF NOT EXISTS idx_ip_copy_detections_evidence 
  ON public.ip_copy_detections (registry_entry_id, similarity_score DESC)
  WHERE evidence_captured_at IS NOT NULL;
