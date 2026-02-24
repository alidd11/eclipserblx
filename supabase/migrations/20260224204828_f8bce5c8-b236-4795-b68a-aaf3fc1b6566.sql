-- Add columns for enhanced copy detection
ALTER TABLE public.ip_copy_detections
ADD COLUMN game_description TEXT,
ADD COLUMN similarity_score INTEGER DEFAULT 0,
ADD COLUMN match_reasons TEXT[] DEFAULT '{}',
ADD COLUMN thumbnail_analyzed BOOLEAN DEFAULT false;