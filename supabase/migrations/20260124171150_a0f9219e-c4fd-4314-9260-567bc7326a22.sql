-- Add refunded_at column to orders if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_id TEXT;

-- Add reversed_at and refund_id to affiliate_commissions
ALTER TABLE public.affiliate_commissions ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.affiliate_commissions ADD COLUMN IF NOT EXISTS refund_id TEXT;

-- Add refund tracking to seller_transactions
ALTER TABLE public.seller_transactions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.seller_transactions ADD COLUMN IF NOT EXISTS refund_id TEXT;

-- Create a function to reverse affiliate commission when refund occurs
CREATE OR REPLACE FUNCTION public.reverse_affiliate_commission(p_order_id UUID, p_refund_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commission RECORD;
BEGIN
  -- Find pending or completed commission for this order
  SELECT * INTO v_commission
  FROM public.affiliate_commissions
  WHERE order_id = p_order_id
    AND status IN ('pending', 'completed')
    AND reversed_at IS NULL
  LIMIT 1;
  
  IF FOUND THEN
    -- Mark commission as reversed
    UPDATE public.affiliate_commissions
    SET 
      status = 'reversed',
      reversed_at = NOW(),
      refund_id = p_refund_id
    WHERE id = v_commission.id;
    
    -- Deduct from affiliate balance
    UPDATE public.affiliate_balances
    SET 
      total_earned = GREATEST(0, total_earned - v_commission.commission_amount),
      available_balance = GREATEST(0, available_balance - v_commission.commission_amount),
      updated_at = NOW()
    WHERE user_id = v_commission.affiliate_id;
  END IF;
END;
$$;

-- Create a function to reverse seller earnings when refund occurs
CREATE OR REPLACE FUNCTION public.reverse_seller_earnings(p_order_id UUID, p_refund_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction RECORD;
  v_total_reversed NUMERIC := 0;
BEGIN
  -- Find all seller transactions for this order that haven't been refunded
  FOR v_transaction IN
    SELECT st.*, s.id as store_id
    FROM public.seller_transactions st
    JOIN public.stores s ON s.id = st.store_id
    WHERE st.order_id = p_order_id
      AND st.type = 'sale'
      AND st.refunded_at IS NULL
  LOOP
    -- Mark transaction as refunded
    UPDATE public.seller_transactions
    SET 
      refunded_at = NOW(),
      refund_id = p_refund_id
    WHERE id = v_transaction.id;
    
    -- Deduct from seller balance (net_amount is what they actually earned)
    UPDATE public.seller_balances
    SET 
      total_earned = GREATEST(0, total_earned - v_transaction.net_amount),
      available_balance = GREATEST(0, available_balance - v_transaction.net_amount),
      updated_at = NOW()
    WHERE store_id = v_transaction.store_id;
    
    v_total_reversed := v_total_reversed + v_transaction.net_amount;
  END LOOP;
END;
$$;