
-- External website detections (copies found on darkblox, script sites, etc.)
CREATE TABLE public.ip_external_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  registry_entry_id UUID REFERENCES public.creator_ip_registry(id) ON DELETE CASCADE,
  source_website TEXT NOT NULL,
  source_url TEXT NOT NULL,
  page_title TEXT,
  matched_content TEXT,
  match_type TEXT NOT NULL DEFAULT 'name_match', -- name_match, url_scan, script_match
  confidence_score INTEGER DEFAULT 0,
  screenshot_url TEXT,
  scraped_content TEXT,
  status TEXT NOT NULL DEFAULT 'detected', -- detected, complaint_filed, resolved, dismissed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_external_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own external detections"
  ON public.ip_external_detections FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert their own external detections"
  ON public.ip_external_detections FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own external detections"
  ON public.ip_external_detections FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Staff can view all external detections"
  ON public.ip_external_detections FOR SELECT
  USING (public.has_permission(auth.uid(), 'ip_shield_staff'));

-- Abuse complaints filed against domain/hosting providers
CREATE TABLE public.ip_abuse_complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  detection_id UUID REFERENCES public.ip_external_detections(id) ON DELETE SET NULL,
  target_domain TEXT NOT NULL,
  target_url TEXT NOT NULL,
  registrar_name TEXT,
  registrar_abuse_email TEXT,
  hosting_provider TEXT,
  hosting_abuse_email TEXT,
  complaint_type TEXT NOT NULL DEFAULT 'dmca', -- dmca, abuse
  complaint_text TEXT NOT NULL,
  sent_to_emails TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, acknowledged, resolved
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_abuse_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own abuse complaints"
  ON public.ip_abuse_complaints FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert their own abuse complaints"
  ON public.ip_abuse_complaints FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own abuse complaints"
  ON public.ip_abuse_complaints FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Staff can view all abuse complaints"
  ON public.ip_abuse_complaints FOR SELECT
  USING (public.has_permission(auth.uid(), 'ip_shield_staff'));
