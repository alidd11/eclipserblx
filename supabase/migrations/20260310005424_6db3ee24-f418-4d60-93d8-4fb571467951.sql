
-- 1. Add escalation columns to refund_requests if missing
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS escalated_at timestamptz;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS escalation_reason text;

-- 2. Create dispute_evidence table
CREATE TABLE public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

-- RLS: customers see evidence on their own disputes
CREATE POLICY "Customers can view own dispute evidence"
  ON public.dispute_evidence FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.refund_requests r 
      WHERE r.id = dispute_id AND r.customer_id = auth.uid()
    )
  );

-- RLS: customers can insert evidence on their own disputes
CREATE POLICY "Customers can upload own dispute evidence"
  ON public.dispute_evidence FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.refund_requests r 
      WHERE r.id = dispute_id AND r.customer_id = auth.uid()
    )
  );

-- RLS: sellers can view evidence on disputes for their store
CREATE POLICY "Sellers can view store dispute evidence"
  ON public.dispute_evidence FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.refund_requests r
      JOIN public.stores s ON s.id = r.store_id
      WHERE r.id = dispute_id AND s.owner_id = auth.uid()
    )
  );

-- RLS: sellers can upload evidence on disputes for their store
CREATE POLICY "Sellers can upload store dispute evidence"
  ON public.dispute_evidence FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.refund_requests r
      JOIN public.stores s ON s.id = r.store_id
      WHERE r.id = dispute_id AND s.owner_id = auth.uid()
    )
  );

-- RLS: staff can view all evidence
CREATE POLICY "Staff can view all dispute evidence"
  ON public.dispute_evidence FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'lead_administrator')
  );

-- 3. Create storage bucket for dispute evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-evidence', 'dispute-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: customers can upload to their dispute folder
CREATE POLICY "Users can upload dispute evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dispute-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: customers can view their own uploads
CREATE POLICY "Users can view own dispute evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dispute-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: staff can view all dispute evidence
CREATE POLICY "Staff can view all dispute evidence files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dispute-evidence' AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
      OR public.has_role(auth.uid(), 'lead_administrator')
    )
  );

-- Storage RLS: sellers can view evidence for disputes on their store
CREATE POLICY "Sellers can view dispute evidence for their store"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dispute-evidence' AND
    EXISTS (
      SELECT 1 FROM public.dispute_evidence de
      JOIN public.refund_requests r ON r.id = de.dispute_id
      JOIN public.stores s ON s.id = r.store_id
      WHERE de.file_path = name AND s.owner_id = auth.uid()
    )
  );

-- 4. Create escalate_dispute RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.escalate_dispute(p_dispute_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dispute RECORD;
BEGIN
  -- Fetch dispute and validate ownership + status
  SELECT * INTO v_dispute
  FROM public.refund_requests
  WHERE id = p_dispute_id AND customer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found or not yours';
  END IF;

  IF v_dispute.status != 'denied' THEN
    RAISE EXCEPTION 'Only denied disputes can be escalated';
  END IF;

  -- Update to escalated
  UPDATE public.refund_requests
  SET 
    status = 'escalated',
    escalated_at = now(),
    escalation_reason = p_reason,
    updated_at = now()
  WHERE id = p_dispute_id;

  -- Create seller notification
  IF v_dispute.store_id IS NOT NULL THEN
    INSERT INTO public.seller_notifications (user_id, type, title, message, action_url)
    SELECT 
      s.owner_id,
      'refund_request',
      'Dispute Escalated to Eclipse',
      'A customer has escalated their dispute to Eclipse for review. Amount: £' || TO_CHAR(v_dispute.amount, 'FM999,999.00'),
      '/seller/refunds'
    FROM public.stores s WHERE s.id = v_dispute.store_id;
  END IF;
END;
$$;
