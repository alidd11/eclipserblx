
-- Table to store GDPR-compliant consent records
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  preferences JSONB NOT NULL,
  action TEXT NOT NULL DEFAULT 'granted',
  ip_address_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_consent_records_visitor ON public.consent_records (visitor_id, created_at DESC);
CREATE INDEX idx_consent_records_user ON public.consent_records (user_id) WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (consent is recorded before auth)
CREATE POLICY "Anyone can record consent"
  ON public.consent_records FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Users can read their own consent records
CREATE POLICY "Users can read own consent"
  ON public.consent_records FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Staff can read all consent records for compliance audits
CREATE POLICY "Staff can read all consent"
  ON public.consent_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
