-- Create table for IP/Copyright violation reports
CREATE TABLE public.ip_violation_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('copyright', 'trademark', 'stolen_asset', 'unauthorized_resale', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  original_work_url TEXT,
  is_rights_holder BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'valid', 'invalid', 'resolved')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ip_violation_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view their own IP reports"
  ON public.ip_violation_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Anyone can create a report (including anonymous users for DMCA compliance)
CREATE POLICY "Anyone can create IP reports"
  ON public.ip_violation_reports
  FOR INSERT
  WITH CHECK (true);

-- Staff can view all reports
CREATE POLICY "Staff can view all IP reports"
  ON public.ip_violation_reports
  FOR SELECT
  USING (public.is_staff(auth.uid()));

-- Staff can update reports
CREATE POLICY "Staff can update IP reports"
  ON public.ip_violation_reports
  FOR UPDATE
  USING (public.is_staff(auth.uid()));

-- Add ip_ownership_confirmed column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS ip_ownership_confirmed BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_ip_violation_reports_product_id ON public.ip_violation_reports(product_id);
CREATE INDEX idx_ip_violation_reports_status ON public.ip_violation_reports(status);

-- Create trigger for updated_at
CREATE TRIGGER update_ip_violation_reports_updated_at
  BEFORE UPDATE ON public.ip_violation_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();