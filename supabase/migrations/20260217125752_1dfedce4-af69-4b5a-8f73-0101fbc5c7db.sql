
-- Create order disputes table
CREATE TABLE public.order_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Prevent duplicate open disputes on same order
CREATE UNIQUE INDEX idx_order_disputes_unique_open 
ON public.order_disputes (order_id) 
WHERE status IN ('open', 'under_review');

-- Enable RLS
ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;

-- Users can view their own disputes
CREATE POLICY "Users can view own disputes"
ON public.order_disputes FOR SELECT
USING (auth.uid() = user_id);

-- Users can create disputes on their own orders
CREATE POLICY "Users can create disputes"
ON public.order_disputes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
ON public.order_disputes FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update disputes
CREATE POLICY "Admins can update disputes"
ON public.order_disputes FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_order_disputes_updated_at
BEFORE UPDATE ON public.order_disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
