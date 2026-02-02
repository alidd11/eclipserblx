-- Credit balances for each user
CREATE TABLE public.credit_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_gifted NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  eclipse_plus_bonus_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Credit transactions history
CREATE TYPE public.credit_transaction_type AS ENUM ('purchase', 'gift', 'spend', 'refund', 'subscription_bonus');

CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  type credit_transaction_type NOT NULL,
  description TEXT,
  reference_id TEXT,
  gifted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_order_id ON public.credit_transactions(order_id);

-- Enable RLS
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Credit balances policies
CREATE POLICY "Users can view their own credit balance"
ON public.credit_balances FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all credit balances"
ON public.credit_balances FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Credit transactions policies
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Function to add credits to a user
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type credit_transaction_type,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_gifted_by UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
)
RETURNS public.credit_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.credit_transactions;
BEGIN
  -- Ensure balance record exists
  INSERT INTO public.credit_balances (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update balance based on type
  IF p_type IN ('purchase', 'gift', 'refund', 'subscription_bonus') THEN
    UPDATE public.credit_balances
    SET 
      balance = balance + p_amount,
      total_purchased = CASE WHEN p_type = 'purchase' THEN total_purchased + p_amount ELSE total_purchased END,
      total_gifted = CASE WHEN p_type IN ('gift', 'subscription_bonus') THEN total_gifted + p_amount ELSE total_gifted END,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_type = 'spend' THEN
    UPDATE public.credit_balances
    SET 
      balance = balance - ABS(p_amount),
      total_spent = total_spent + ABS(p_amount),
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description, reference_id, gifted_by, order_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_reference_id, p_gifted_by, p_order_id)
  RETURNING * INTO v_transaction;
  
  RETURN v_transaction;
END;
$$;

-- Function to check and spend credits
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO v_current_balance
  FROM public.credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits
  PERFORM public.add_credits(
    p_user_id,
    p_amount,
    'spend'::credit_transaction_type,
    p_description,
    NULL,
    NULL,
    p_order_id
  );
  
  RETURN TRUE;
END;
$$;

-- Function to mark Eclipse+ bonus as claimed
CREATE OR REPLACE FUNCTION public.claim_eclipse_plus_credit_bonus(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_claimed BOOLEAN;
BEGIN
  -- Check if already claimed
  SELECT eclipse_plus_bonus_claimed INTO v_already_claimed
  FROM public.credit_balances
  WHERE user_id = p_user_id;
  
  IF v_already_claimed IS TRUE THEN
    RETURN FALSE;
  END IF;
  
  -- Ensure balance exists and mark as claimed
  INSERT INTO public.credit_balances (user_id, balance, eclipse_plus_bonus_claimed)
  VALUES (p_user_id, 0, TRUE)
  ON CONFLICT (user_id) DO UPDATE SET eclipse_plus_bonus_claimed = TRUE;
  
  -- Add the £10 credit bonus
  PERFORM public.add_credits(
    p_user_id,
    10.00,
    'subscription_bonus'::credit_transaction_type,
    'Eclipse+ Welcome Bonus'
  );
  
  RETURN TRUE;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_credit_balances_updated_at
BEFORE UPDATE ON public.credit_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();