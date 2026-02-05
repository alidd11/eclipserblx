-- =====================================================
-- SELLER TRUST SCORING & QUARANTINE SYSTEM
-- =====================================================

-- 1. Create seller security tracking table
CREATE TABLE public.seller_security_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trust_score INTEGER NOT NULL DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  total_uploads INTEGER NOT NULL DEFAULT 0,
  flagged_uploads INTEGER NOT NULL DEFAULT 0,
  blocked_uploads INTEGER NOT NULL DEFAULT 0,
  last_violation_at TIMESTAMPTZ,
  violation_types JSONB DEFAULT '[]'::jsonb,
  is_restricted BOOLEAN DEFAULT FALSE,
  restricted_at TIMESTAMPTZ,
  restricted_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- 2. Create quarantine table for flagged files
CREATE TABLE public.quarantined_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  original_file_name TEXT NOT NULL,
  original_file_path TEXT NOT NULL,
  quarantine_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  threat_type TEXT NOT NULL,
  threat_details JSONB DEFAULT '{}'::jsonb,
  scan_results JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'quarantined' CHECK (status IN ('quarantined', 'released', 'deleted', 'blocked')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create file hashes table to track known bad files
CREATE TABLE public.file_hash_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash TEXT NOT NULL UNIQUE,
  hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  is_blocked BOOLEAN DEFAULT FALSE,
  threat_type TEXT,
  threat_details TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_count INTEGER NOT NULL DEFAULT 1,
  blocked_by UUID REFERENCES auth.users(id),
  blocked_at TIMESTAMPTZ
);

-- 4. Enable RLS
ALTER TABLE public.seller_security_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarantined_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_hash_registry ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for seller_security_scores
CREATE POLICY "Staff can manage seller security scores"
  ON public.seller_security_scores FOR ALL
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Sellers can view own store security score"
  ON public.seller_security_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = seller_security_scores.store_id AND s.owner_id = auth.uid()
    )
  );

-- 6. RLS Policies for quarantined_files
CREATE POLICY "Staff can manage quarantined files"
  ON public.quarantined_files FOR ALL
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Sellers can view own quarantined files"
  ON public.quarantined_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = quarantined_files.store_id AND s.owner_id = auth.uid()
    )
  );

-- 7. RLS Policies for file_hash_registry
CREATE POLICY "Staff can manage file hash registry"
  ON public.file_hash_registry FOR ALL
  USING (public.is_staff(auth.uid()));

-- 8. Function to update seller trust score
CREATE OR REPLACE FUNCTION public.update_seller_trust_score(
  p_store_id UUID,
  p_is_flagged BOOLEAN,
  p_is_blocked BOOLEAN,
  p_violation_type TEXT DEFAULT NULL
) RETURNS public.seller_security_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score public.seller_security_scores;
  v_penalty INTEGER := 0;
BEGIN
  IF p_is_blocked THEN
    v_penalty := 15;
  ELSIF p_is_flagged THEN
    v_penalty := 5;
  END IF;

  INSERT INTO public.seller_security_scores (store_id, total_uploads, flagged_uploads, blocked_uploads, trust_score)
  VALUES (p_store_id, 1, CASE WHEN p_is_flagged THEN 1 ELSE 0 END, CASE WHEN p_is_blocked THEN 1 ELSE 0 END, GREATEST(0, 100 - v_penalty))
  ON CONFLICT (store_id) DO UPDATE SET
    total_uploads = seller_security_scores.total_uploads + 1,
    flagged_uploads = seller_security_scores.flagged_uploads + CASE WHEN p_is_flagged THEN 1 ELSE 0 END,
    blocked_uploads = seller_security_scores.blocked_uploads + CASE WHEN p_is_blocked THEN 1 ELSE 0 END,
    trust_score = GREATEST(0, seller_security_scores.trust_score - v_penalty),
    last_violation_at = CASE WHEN p_is_flagged OR p_is_blocked THEN now() ELSE seller_security_scores.last_violation_at END,
    violation_types = CASE 
      WHEN p_violation_type IS NOT NULL THEN 
        seller_security_scores.violation_types || jsonb_build_object('type', p_violation_type, 'at', now())
      ELSE seller_security_scores.violation_types 
    END,
    is_restricted = CASE WHEN GREATEST(0, seller_security_scores.trust_score - v_penalty) < 30 THEN TRUE ELSE seller_security_scores.is_restricted END,
    restricted_at = CASE WHEN GREATEST(0, seller_security_scores.trust_score - v_penalty) < 30 AND seller_security_scores.is_restricted = FALSE THEN now() ELSE seller_security_scores.restricted_at END,
    restricted_reason = CASE WHEN GREATEST(0, seller_security_scores.trust_score - v_penalty) < 30 AND seller_security_scores.is_restricted = FALSE THEN 'Trust score fell below 30 due to repeated violations' ELSE seller_security_scores.restricted_reason END,
    updated_at = now()
  RETURNING * INTO v_score;

  RETURN v_score;
END;
$$;

-- 9. Function to check if seller can upload
CREATE OR REPLACE FUNCTION public.can_seller_upload(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NOT EXISTS (
      SELECT 1 FROM public.seller_security_scores
      WHERE store_id = p_store_id AND is_restricted = TRUE
    ),
    TRUE
  );
$$;

-- 10. Add indexes for performance
CREATE INDEX idx_seller_security_scores_store_id ON public.seller_security_scores(store_id);
CREATE INDEX idx_seller_security_scores_trust_score ON public.seller_security_scores(trust_score);
CREATE INDEX idx_quarantined_files_store_id ON public.quarantined_files(store_id);
CREATE INDEX idx_quarantined_files_status ON public.quarantined_files(status);
CREATE INDEX idx_quarantined_files_threat_type ON public.quarantined_files(threat_type);
CREATE INDEX idx_file_hash_registry_hash ON public.file_hash_registry(file_hash);
CREATE INDEX idx_file_hash_registry_blocked ON public.file_hash_registry(is_blocked) WHERE is_blocked = TRUE;

-- 11. Triggers for updated_at
CREATE TRIGGER update_seller_security_scores_updated_at
  BEFORE UPDATE ON public.seller_security_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quarantined_files_updated_at
  BEFORE UPDATE ON public.quarantined_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Create quarantine storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quarantine', 'quarantine', false)
ON CONFLICT (id) DO NOTHING;

-- 13. Storage policies for quarantine bucket - staff only
CREATE POLICY "Staff can access quarantine bucket"
  ON storage.objects FOR ALL
  USING (bucket_id = 'quarantine' AND public.is_staff(auth.uid()));