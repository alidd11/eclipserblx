
-- Add screenshot columns to takedown_requests
ALTER TABLE public.takedown_requests
ADD COLUMN IF NOT EXISTS original_proof_screenshots TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS infringing_evidence_screenshots TEXT[] DEFAULT '{}';

-- Create storage bucket for takedown evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('takedown-evidence', 'takedown-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload takedown evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'takedown-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view their own uploads
CREATE POLICY "Users can view own takedown evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'takedown-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Staff/admins can view all takedown evidence
CREATE POLICY "Staff can view all takedown evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'takedown-evidence'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lead_administrator')
    OR public.has_permission(auth.uid(), 'ip_shield_staff')
  )
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own takedown evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'takedown-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
