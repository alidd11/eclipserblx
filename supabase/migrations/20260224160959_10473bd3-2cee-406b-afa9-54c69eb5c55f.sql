
-- Table to track Stripe Identity verification sessions per user
CREATE TABLE public.identity_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requires_input',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_identity_verifications_user ON public.identity_verifications (user_id);
CREATE INDEX idx_identity_verifications_session ON public.identity_verifications (stripe_session_id);

ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY "Users can view own verifications"
  ON public.identity_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Service role inserts/updates only (edge functions)
CREATE POLICY "Service role can manage verifications"
  ON public.identity_verifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
