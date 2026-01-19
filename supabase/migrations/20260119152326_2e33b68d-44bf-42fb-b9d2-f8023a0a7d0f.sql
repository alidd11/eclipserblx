-- Create affiliate applications table
CREATE TABLE public.affiliate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  paypal_email TEXT,
  discord_username TEXT,
  promotion_method TEXT NOT NULL,
  audience_size TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own application
CREATE POLICY "Users can view own application"
ON public.affiliate_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own application
CREATE POLICY "Users can create own application"
ON public.affiliate_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Staff can view all applications
CREATE POLICY "Staff can view all applications"
ON public.affiliate_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

-- Staff can update applications
CREATE POLICY "Staff can update applications"
ON public.affiliate_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

-- Add paypal_email to affiliate_payouts for manual payouts
ALTER TABLE public.affiliate_payouts 
ADD COLUMN IF NOT EXISTS paypal_email TEXT;

-- Create trigger for updated_at
CREATE TRIGGER update_affiliate_applications_updated_at
BEFORE UPDATE ON public.affiliate_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();