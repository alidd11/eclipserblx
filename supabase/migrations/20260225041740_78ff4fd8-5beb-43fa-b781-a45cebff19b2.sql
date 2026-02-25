-- Add asset fingerprint data column to ip_copy_detections
ALTER TABLE public.ip_copy_detections 
ADD COLUMN IF NOT EXISTS asset_fingerprint_data jsonb DEFAULT null;