-- Create developer_product_submissions table
CREATE TABLE public.developer_product_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  files JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  reviewer_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  approved_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create developer_payments table (admin-only)
CREATE TABLE public.developer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payment_type TEXT NOT NULL DEFAULT 'salary' CHECK (payment_type IN ('salary', 'commission', 'bonus', 'freelance', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  due_date DATE,
  paid_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_developer_submissions_developer_id ON public.developer_product_submissions(developer_id);
CREATE INDEX idx_developer_submissions_status ON public.developer_product_submissions(status);
CREATE INDEX idx_developer_payments_developer_id ON public.developer_payments(developer_id);
CREATE INDEX idx_developer_payments_status ON public.developer_payments(status);
CREATE INDEX idx_developer_payments_due_date ON public.developer_payments(due_date);

-- Enable RLS
ALTER TABLE public.developer_product_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for developer_product_submissions
-- Staff can view all submissions
CREATE POLICY "Staff can view all submissions"
ON public.developer_product_submissions
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can insert their own submissions
CREATE POLICY "Staff can insert own submissions"
ON public.developer_product_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_staff(auth.uid()) AND developer_id = auth.uid()
);

-- Admins can update submissions (for approval/rejection)
CREATE POLICY "Admins can update submissions"
ON public.developer_product_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete submissions
CREATE POLICY "Admins can delete submissions"
ON public.developer_product_submissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for developer_payments (ADMIN ONLY)
CREATE POLICY "Admins can view payments"
ON public.developer_payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payments"
ON public.developer_payments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payments"
ON public.developer_payments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payments"
ON public.developer_payments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_developer_submissions_updated_at
  BEFORE UPDATE ON public.developer_product_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_developer_payments_updated_at
  BEFORE UPDATE ON public.developer_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add manage_developer_submissions permission
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_developer_submissions', 'View and manage developer product submissions', 'team')
ON CONFLICT (name) DO NOTHING;