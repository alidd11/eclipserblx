-- Sync all store follower counts to match actual store_follows records
UPDATE public.stores s
SET follower_count = (
  SELECT COUNT(*)
  FROM public.store_follows sf
  WHERE sf.store_id = s.id
);