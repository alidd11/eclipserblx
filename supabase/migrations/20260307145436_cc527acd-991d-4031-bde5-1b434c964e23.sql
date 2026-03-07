
-- Drop the duplicate triggers (keep only one that does a proper COUNT)
DROP TRIGGER IF EXISTS on_store_follow_insert ON public.store_follows;
DROP TRIGGER IF EXISTS on_store_follow_delete ON public.store_follows;
DROP TRIGGER IF EXISTS update_follower_count_trigger ON public.store_follows;

-- Replace the function to use actual COUNT instead of increment/decrement
CREATE OR REPLACE FUNCTION public.update_store_follower_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_store_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    affected_store_id := NEW.store_id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_store_id := OLD.store_id;
  END IF;

  UPDATE public.stores
  SET follower_count = (
    SELECT COUNT(*) FROM public.store_follows WHERE store_id = affected_store_id
  )
  WHERE id = affected_store_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create a single trigger for both insert and delete
CREATE TRIGGER update_follower_count_trigger
  AFTER INSERT OR DELETE ON public.store_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_follower_count();

-- Fix the current incorrect count for Harley's store
UPDATE public.stores 
SET follower_count = (
  SELECT COUNT(*) FROM public.store_follows WHERE store_id = stores.id
)
WHERE name ILIKE '%harley%';
