ALTER TABLE public.leak_scan_results ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Migrate existing dismissed results
UPDATE public.leak_scan_results SET status = 'ignored' WHERE dismissed = true;