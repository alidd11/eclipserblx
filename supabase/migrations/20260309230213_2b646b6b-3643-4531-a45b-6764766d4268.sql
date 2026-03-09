
-- Add a processing lock column to prevent concurrent processing
ALTER TABLE public.seller_payouts 
ADD COLUMN IF NOT EXISTS processing_locked_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processing_lock_id text DEFAULT NULL;

-- Create atomic claim function for payout processing
-- Returns the payout ID if successfully claimed, NULL if already claimed
CREATE OR REPLACE FUNCTION public.claim_payout_for_processing(
  p_payout_id uuid,
  p_lock_id text,
  p_expected_status text DEFAULT 'pending'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claimed boolean;
BEGIN
  UPDATE public.seller_payouts
  SET 
    processing_locked_at = now(),
    processing_lock_id = p_lock_id
  WHERE id = p_payout_id
    AND status = p_expected_status
    AND (processing_locked_at IS NULL OR processing_locked_at < now() - interval '10 minutes');
  
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed > 0;
END;
$$;

-- Create atomic balance deduction function to prevent read-then-write races
CREATE OR REPLACE FUNCTION public.deduct_seller_balance(
  p_user_id uuid,
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.seller_balances
  SET 
    available_balance = GREATEST(0, available_balance - p_amount),
    total_paid = total_paid + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id
    AND available_balance >= p_amount;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Create webhook event dedup table for Stripe
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-cleanup old events (older than 7 days)
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at 
ON public.processed_webhook_events(processed_at);

-- RLS: only service role should access this
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
