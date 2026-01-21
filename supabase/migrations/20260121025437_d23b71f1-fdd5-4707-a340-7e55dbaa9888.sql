-- Create function to update store follower count
CREATE OR REPLACE FUNCTION public.update_store_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stores
    SET follower_count = COALESCE(follower_count, 0) + 1
    WHERE id = NEW.store_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stores
    SET follower_count = GREATEST(COALESCE(follower_count, 0) - 1, 0)
    WHERE id = OLD.store_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for insert (follow)
DROP TRIGGER IF EXISTS on_store_follow_insert ON public.store_follows;
CREATE TRIGGER on_store_follow_insert
  AFTER INSERT ON public.store_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_follower_count();

-- Create trigger for delete (unfollow)
DROP TRIGGER IF EXISTS on_store_follow_delete ON public.store_follows;
CREATE TRIGGER on_store_follow_delete
  AFTER DELETE ON public.store_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_follower_count();