-- Fix existing product counts for all stores
UPDATE stores s
SET product_count = (
  SELECT COUNT(*) FROM products p 
  WHERE p.store_id = s.id 
    AND p.is_active = true 
    AND p.moderation_status = 'approved'
);

-- Create function to recalculate store product count
CREATE OR REPLACE FUNCTION public.update_store_product_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_store_id UUID;
BEGIN
  -- Determine which store_id was affected
  IF TG_OP = 'DELETE' THEN
    affected_store_id := OLD.store_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new store if store_id changed
    IF OLD.store_id IS DISTINCT FROM NEW.store_id THEN
      -- Update old store count
      IF OLD.store_id IS NOT NULL THEN
        UPDATE stores SET product_count = (
          SELECT COUNT(*) FROM products 
          WHERE store_id = OLD.store_id 
            AND is_active = true 
            AND moderation_status = 'approved'
        ) WHERE id = OLD.store_id;
      END IF;
    END IF;
    affected_store_id := NEW.store_id;
  ELSE
    affected_store_id := NEW.store_id;
  END IF;

  -- Update the affected store's product count
  IF affected_store_id IS NOT NULL THEN
    UPDATE stores SET product_count = (
      SELECT COUNT(*) FROM products 
      WHERE store_id = affected_store_id 
        AND is_active = true 
        AND moderation_status = 'approved'
    ) WHERE id = affected_store_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on INSERT, UPDATE, DELETE of products
CREATE TRIGGER update_store_product_count_trigger
AFTER INSERT OR UPDATE OF is_active, moderation_status, store_id OR DELETE
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_store_product_count();