-- Sync existing store_payment_details.payout_method to stores.payout_method for any mismatches
UPDATE public.stores s
SET payout_method = spd.payout_method
FROM public.store_payment_details spd
WHERE spd.store_id = s.id
  AND spd.payout_method IS NOT NULL
  AND s.payout_method IS DISTINCT FROM spd.payout_method;