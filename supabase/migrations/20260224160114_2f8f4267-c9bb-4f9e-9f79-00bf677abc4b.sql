
-- IP Shield: Takedown request tracking for verified creators
CREATE TABLE public.takedown_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Creator info
  creator_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  
  -- Case details
  case_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'notice_sent', 'resolved', 'rejected', 'counter_notice')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Infringement details
  infringement_type TEXT NOT NULL CHECK (infringement_type IN ('copyright', 'trademark', 'stolen_asset', 'unauthorized_resale', 'other')),
  target_platform TEXT NOT NULL CHECK (target_platform IN ('roblox', 'discord', 'youtube', 'tiktok', 'other_marketplace', 'other')),
  target_platform_other TEXT,
  
  -- URLs and evidence
  infringing_url TEXT NOT NULL,
  original_work_url TEXT,
  original_work_description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  evidence_notes TEXT,
  
  -- Legal declarations
  good_faith_statement BOOLEAN NOT NULL DEFAULT false,
  accuracy_statement BOOLEAN NOT NULL DEFAULT false,
  ownership_confirmed BOOLEAN NOT NULL DEFAULT false,
  
  -- Resolution
  notice_sent_at TIMESTAMPTZ,
  notice_sent_to TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  rejection_reason TEXT,
  
  -- Counter-notice tracking
  counter_notice_received_at TIMESTAMPTZ,
  counter_notice_details TEXT,
  counter_notice_deadline TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generate case numbers
CREATE OR REPLACE FUNCTION public.generate_takedown_case_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  number_exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'IPS-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    SELECT EXISTS(SELECT 1 FROM takedown_requests WHERE case_number = new_number) INTO number_exists;
    EXIT WHEN NOT number_exists;
  END LOOP;
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_takedown_case_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.case_number IS NULL THEN
    NEW.case_number := generate_takedown_case_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_takedown_case_number_trigger
  BEFORE INSERT ON public.takedown_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_takedown_case_number();

-- Activity log for each case
CREATE TABLE public.takedown_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takedown_id UUID NOT NULL REFERENCES public.takedown_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Creator IP registry (original works they want to protect)
CREATE TABLE public.creator_ip_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  title TEXT NOT NULL,
  description TEXT,
  work_type TEXT NOT NULL CHECK (work_type IN ('script', 'model', 'ui', 'game', 'brand', 'other')),
  proof_urls TEXT[] DEFAULT '{}',
  roblox_asset_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.takedown_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takedown_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_ip_registry ENABLE ROW LEVEL SECURITY;

-- Creators can view their own takedown requests
CREATE POLICY "Creators can view own takedowns"
  ON public.takedown_requests FOR SELECT
  USING (auth.uid() = creator_id);

-- Creators can insert takedown requests
CREATE POLICY "Creators can submit takedowns"
  ON public.takedown_requests FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Staff can view all takedown requests
CREATE POLICY "Staff can view all takedowns"
  ON public.takedown_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Staff can update takedown requests
CREATE POLICY "Staff can update takedowns"
  ON public.takedown_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Activity log: creators see their own, staff see all
CREATE POLICY "Creators can view own activity"
  ON public.takedown_activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM takedown_requests tr WHERE tr.id = takedown_id AND tr.creator_id = auth.uid())
  );

CREATE POLICY "Staff can manage activity log"
  ON public.takedown_activity_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- IP Registry: creators manage their own
CREATE POLICY "Creators can manage own IP registry"
  ON public.creator_ip_registry FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Staff can view IP registry
CREATE POLICY "Staff can view IP registry"
  ON public.creator_ip_registry FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Indexes
CREATE INDEX idx_takedown_requests_creator ON public.takedown_requests(creator_id);
CREATE INDEX idx_takedown_requests_status ON public.takedown_requests(status);
CREATE INDEX idx_takedown_activity_log_takedown ON public.takedown_activity_log(takedown_id);
CREATE INDEX idx_creator_ip_registry_creator ON public.creator_ip_registry(creator_id);
