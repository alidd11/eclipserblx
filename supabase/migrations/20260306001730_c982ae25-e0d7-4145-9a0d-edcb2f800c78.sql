
-- Add escrow columns to seller_transactions
ALTER TABLE public.seller_transactions 
  ADD COLUMN IF NOT EXISTS escrow_hold_until timestamptz,
  ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS escrow_frozen boolean NOT NULL DEFAULT false;

-- Create function to freeze escrow when dispute is created
CREATE OR REPLACE FUNCTION public.freeze_escrow_on_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Freeze all unreleased seller transactions for this order
  UPDATE public.seller_transactions
  SET escrow_frozen = true
  WHERE order_id = NEW.order_id
    AND escrow_released_at IS NULL
    AND type = 'sale'
    AND refunded_at IS NULL;
  RETURN NEW;
END;
$$;

-- Create trigger on order_disputes
DROP TRIGGER IF EXISTS freeze_escrow_on_dispute_trigger ON public.order_disputes;
CREATE TRIGGER freeze_escrow_on_dispute_trigger
  AFTER INSERT ON public.order_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.freeze_escrow_on_dispute();

-- Create function to release escrow (called by cron edge function)
CREATE OR REPLACE FUNCTION public.release_escrow_funds()
RETURNS TABLE(released_count integer, total_released numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_count INTEGER := 0;
  v_total NUMERIC := 0;
BEGIN
  -- Find all transactions ready for release
  FOR v_tx IN
    SELECT id, seller_id, store_id, net_amount
    FROM public.seller_transactions
    WHERE escrow_hold_until IS NOT NULL
      AND escrow_hold_until <= now()
      AND escrow_released_at IS NULL
      AND escrow_frozen = false
      AND type = 'sale'
      AND refunded_at IS NULL
  LOOP
    -- Mark as released
    UPDATE public.seller_transactions
    SET escrow_released_at = now()
    WHERE id = v_tx.id;

    -- Move from pending_balance to available_balance
    UPDATE public.seller_balances
    SET 
      pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - COALESCE(v_tx.net_amount, 0)),
      available_balance = COALESCE(available_balance, 0) + COALESCE(v_tx.net_amount, 0),
      updated_at = now()
    WHERE user_id = v_tx.seller_id;

    v_count := v_count + 1;
    v_total := v_total + COALESCE(v_tx.net_amount, 0);
  END LOOP;

  RETURN QUERY SELECT v_count, v_total;
END;
$$;
