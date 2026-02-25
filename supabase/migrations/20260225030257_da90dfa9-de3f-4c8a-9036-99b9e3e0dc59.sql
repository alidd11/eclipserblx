
-- Add scan run tracking
CREATE TABLE IF NOT EXISTS public.ip_scan_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  registry_entry_id UUID,
  scan_type TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_searches INTEGER DEFAULT 0,
  total_detected INTEGER DEFAULT 0,
  thumbnails_analyzed INTEGER DEFAULT 0,
  evidence_collected INTEGER DEFAULT 0,
  error_message TEXT,
  custom_keywords TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_scan_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scan runs" ON public.ip_scan_runs
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own scan runs" ON public.ip_scan_runs
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Add confidence_level to detections for better filtering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_copy_detections' AND column_name = 'confidence_level') THEN
    ALTER TABLE public.ip_copy_detections ADD COLUMN confidence_level TEXT DEFAULT 'low';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_copy_detections' AND column_name = 'scan_run_id') THEN
    ALTER TABLE public.ip_copy_detections ADD COLUMN scan_run_id UUID;
  END IF;
END $$;
