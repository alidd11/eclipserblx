-- Add paypal_email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paypal_email text;

-- Create affiliate_commissions table to track every commission earned
CREATE TABLE public.affiliate_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL,
  order_total numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.20,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create affiliate_balances table to track running balance for each affiliate
CREATE TABLE public.affiliate_balances (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  total_earned numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  available_balance numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create affiliate_payouts table to track payout requests and history
CREATE TABLE public.affiliate_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paypal_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  paypal_payout_id text,
  processed_at timestamp with time zone,
  processed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text
);

-- Create indexes for better query performance
CREATE INDEX idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_commissions_order_id ON public.affiliate_commissions(order_id);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX idx_affiliate_payouts_user_id ON public.affiliate_payouts(user_id);
CREATE INDEX idx_affiliate_payouts_status ON public.affiliate_payouts(status);

-- Enable RLS on all new tables
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_commissions
CREATE POLICY "Users can view their own commissions"
  ON public.affiliate_commissions FOR SELECT
  USING (auth.uid() = affiliate_id);

CREATE POLICY "Staff can view all commissions"
  ON public.affiliate_commissions FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "System can insert commissions"
  ON public.affiliate_commissions FOR INSERT
  WITH CHECK (true);

-- RLS policies for affiliate_balances
CREATE POLICY "Users can view their own balance"
  ON public.affiliate_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all balances"
  ON public.affiliate_balances FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "System can manage balances"
  ON public.affiliate_balances FOR ALL
  USING (true);

-- RLS policies for affiliate_payouts
CREATE POLICY "Users can view their own payouts"
  ON public.affiliate_payouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request payouts"
  ON public.affiliate_payouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all payouts"
  ON public.affiliate_payouts FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update payouts"
  ON public.affiliate_payouts FOR UPDATE
  USING (public.is_staff(auth.uid()));

-- Function to update affiliate balance
CREATE OR REPLACE FUNCTION public.update_affiliate_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update the affiliate balance
  INSERT INTO public.affiliate_balances (user_id, total_earned, available_balance, updated_at)
  VALUES (NEW.affiliate_id, NEW.commission_amount, NEW.commission_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_earned = affiliate_balances.total_earned + NEW.commission_amount,
    available_balance = affiliate_balances.available_balance + NEW.commission_amount,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update balance when commission is inserted
CREATE TRIGGER update_balance_on_commission
  AFTER INSERT ON public.affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_affiliate_balance();

-- Function to update balance after payout completion
CREATE OR REPLACE FUNCTION public.update_balance_after_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.affiliate_balances
    SET 
      total_paid = total_paid + NEW.amount,
      available_balance = available_balance - NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update balance when payout is completed
CREATE TRIGGER update_balance_on_payout_complete
  AFTER UPDATE ON public.affiliate_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_balance_after_payout();

-- Enable realtime for affiliate tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_payouts;