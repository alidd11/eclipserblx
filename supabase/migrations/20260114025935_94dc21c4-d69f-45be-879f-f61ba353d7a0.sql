-- Create table to track review reminders for customers
CREATE TABLE public.review_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  reminder_1h_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_72h_sent BOOLEAN NOT NULL DEFAULT false,
  review_submitted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view their own review reminders"
ON public.review_reminders
FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view all reminders
CREATE POLICY "Staff can view all review reminders"
ON public.review_reminders
FOR SELECT
USING (public.is_staff(auth.uid()));

-- System can insert reminders (via service role)
CREATE POLICY "Service role can manage review reminders"
ON public.review_reminders
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_review_reminders_user_id ON public.review_reminders(user_id);
CREATE INDEX idx_review_reminders_order_id ON public.review_reminders(order_id);
CREATE INDEX idx_review_reminders_pending ON public.review_reminders(review_submitted, created_at) 
  WHERE review_submitted = false;

-- Trigger to update updated_at
CREATE TRIGGER update_review_reminders_updated_at
BEFORE UPDATE ON public.review_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();