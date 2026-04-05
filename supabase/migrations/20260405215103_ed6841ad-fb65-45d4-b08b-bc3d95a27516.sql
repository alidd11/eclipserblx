
-- Add IP binding to download tokens
ALTER TABLE public.download_tokens ADD COLUMN IF NOT EXISTS creator_ip text;

-- Leak detection registry
CREATE TABLE IF NOT EXISTS public.leak_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  reported_by uuid NOT NULL,
  file_hash text,
  extracted_fingerprint text,
  matched_user_id uuid,
  matched_display_name text,
  status text DEFAULT 'pending' NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_leak_report_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_leak_report_status
  BEFORE INSERT OR UPDATE ON public.leak_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_leak_report_status();

ALTER TABLE public.leak_reports ENABLE ROW LEVEL SECURITY;

-- Store owners can view their own store's leak reports
CREATE POLICY "Store owners can view their leak reports"
  ON public.leak_reports FOR SELECT
  TO authenticated
  USING (
    public.is_store_owner(store_id, auth.uid())
    OR public.is_staff(auth.uid())
  );

-- Store owners can create leak reports for their products
CREATE POLICY "Store owners can create leak reports"
  ON public.leak_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_store_owner(store_id, auth.uid())
    AND reported_by = auth.uid()
  );

-- Staff can update leak reports (confirm/dismiss)
CREATE POLICY "Staff can update leak reports"
  ON public.leak_reports FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX idx_leak_reports_store_id ON public.leak_reports(store_id);
CREATE INDEX idx_leak_reports_product_id ON public.leak_reports(product_id);
CREATE INDEX idx_leak_reports_fingerprint ON public.leak_reports(extracted_fingerprint);
