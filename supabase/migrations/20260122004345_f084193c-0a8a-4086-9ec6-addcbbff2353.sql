-- Create table for marketplace interest registrations
CREATE TABLE public.marketplace_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_interest ENABLE ROW LEVEL SECURITY;

-- Users can see their own interest registration
CREATE POLICY "Users can view their own interest"
  ON public.marketplace_interest
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can register their interest
CREATE POLICY "Users can register interest"
  ON public.marketplace_interest
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their interest
CREATE POLICY "Users can remove their interest"
  ON public.marketplace_interest
  FOR DELETE
  USING (auth.uid() = user_id);

-- Staff can view all interest registrations
CREATE POLICY "Staff can view all interest"
  ON public.marketplace_interest
  FOR SELECT
  USING (public.is_staff(auth.uid()));