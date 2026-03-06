
-- Step 1: Backfill escrow_hold_until for transactions that don't have it
UPDATE public.seller_transactions
SET escrow_hold_until = created_at + interval '3 days'
WHERE escrow_hold_until IS NULL
  AND type = 'sale'
  AND refunded_at IS NULL;

-- Step 2: Mark transactions past their escrow hold as released
UPDATE public.seller_transactions
SET escrow_released_at = escrow_hold_until
WHERE escrow_hold_until IS NOT NULL
  AND escrow_hold_until <= now()
  AND escrow_released_at IS NULL
  AND escrow_frozen = false
  AND type = 'sale'
  AND refunded_at IS NULL;

-- Step 3: Recalculate all seller_balances from actual transaction data
UPDATE public.seller_balances sb
SET
  available_balance = COALESCE((
    SELECT SUM(st.net_amount)
    FROM public.seller_transactions st
    WHERE st.seller_id = sb.user_id
      AND st.type = 'sale'
      AND st.refunded_at IS NULL
      AND st.escrow_released_at IS NOT NULL
      AND st.escrow_frozen = false
  ), 0) - COALESCE(sb.total_paid, 0),
  pending_balance = COALESCE((
    SELECT SUM(st.net_amount)
    FROM public.seller_transactions st
    WHERE st.seller_id = sb.user_id
      AND st.type = 'sale'
      AND st.refunded_at IS NULL
      AND st.escrow_released_at IS NULL
      AND st.escrow_frozen = false
  ), 0),
  total_earned = COALESCE((
    SELECT SUM(st.net_amount)
    FROM public.seller_transactions st
    WHERE st.seller_id = sb.user_id
      AND st.type = 'sale'
      AND st.refunded_at IS NULL
  ), 0),
  updated_at = now();
