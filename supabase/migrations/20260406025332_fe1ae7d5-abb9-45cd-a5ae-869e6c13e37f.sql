ALTER TABLE public.leak_scan_results
  ADD COLUMN IF NOT EXISTS extracted_fingerprint text,
  ADD COLUMN IF NOT EXISTS matched_user_id uuid,
  ADD COLUMN IF NOT EXISTS matched_display_name text;