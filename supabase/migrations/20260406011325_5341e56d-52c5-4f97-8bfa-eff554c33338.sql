-- Store Health Scores table
CREATE TABLE public.store_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  overall_score integer NOT NULL DEFAULT 100,
  dispute_rate numeric NOT NULL DEFAULT 0,
  avg_response_hours numeric NOT NULL DEFAULT 0,
  listing_quality_score numeric NOT NULL DEFAULT 100,
  delivery_rate numeric NOT NULL DEFAULT 100,
  active_violations integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'healthy',
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

ALTER TABLE public.store_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own health score"
ON public.store_health_scores FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_health_scores.store_id AND s.owner_id = auth.uid())
  OR public.is_staff(auth.uid())
);

-- Compliance Violations table
CREATE TABLE public.compliance_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  violation_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  description text NOT NULL,
  is_auto_detected boolean NOT NULL DEFAULT true,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  related_product_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own violations"
ON public.compliance_violations FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = compliance_violations.store_id AND s.owner_id = auth.uid())
  OR public.is_staff(auth.uid())
);

CREATE POLICY "Staff can manage violations"
ON public.compliance_violations FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update violations"
ON public.compliance_violations FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete violations"
ON public.compliance_violations FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX idx_store_health_store ON public.store_health_scores(store_id);
CREATE INDEX idx_store_health_status ON public.store_health_scores(status);
CREATE INDEX idx_compliance_store ON public.compliance_violations(store_id);
CREATE INDEX idx_compliance_resolved ON public.compliance_violations(is_resolved);
CREATE INDEX idx_compliance_type ON public.compliance_violations(violation_type);