
-- Table to store IP monitoring scan results and alerts
CREATE TABLE public.ip_monitor_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registry_entry_id UUID NOT NULL REFERENCES public.creator_ip_registry(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  roblox_asset_id TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'ownership_mismatch',
  current_owner_id TEXT,
  current_owner_name TEXT,
  asset_name TEXT,
  details JSONB,
  emailed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to track scan runs
CREATE TABLE public.ip_monitor_scan_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_assets_scanned INTEGER DEFAULT 0,
  total_alerts_generated INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.ip_monitor_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_monitor_scan_runs ENABLE ROW LEVEL SECURITY;

-- Creators can view their own alerts
CREATE POLICY "Creators can view their own alerts"
  ON public.ip_monitor_alerts FOR SELECT
  USING (auth.uid() = creator_id);

-- Creators can dismiss their own alerts
CREATE POLICY "Creators can update their own alerts"
  ON public.ip_monitor_alerts FOR UPDATE
  USING (auth.uid() = creator_id);

-- Staff can view all alerts
CREATE POLICY "Staff can view all alerts"
  ON public.ip_monitor_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Scan runs viewable by staff only
CREATE POLICY "Staff can view scan runs"
  ON public.ip_monitor_scan_runs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for quick lookups
CREATE INDEX idx_ip_monitor_alerts_creator ON public.ip_monitor_alerts(creator_id);
CREATE INDEX idx_ip_monitor_alerts_asset ON public.ip_monitor_alerts(roblox_asset_id);
