
-- Add additional asset files column to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS additional_asset_files text[] DEFAULT '{}';

-- Create a function to validate product file count based on seller subscription
CREATE OR REPLACE FUNCTION public.validate_product_file_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_store_owner_id uuid;
  v_is_pro boolean;
  v_max_files integer;
  v_total_files integer;
BEGIN
  -- Get store owner
  SELECT owner_id INTO v_store_owner_id
  FROM public.stores
  WHERE id = NEW.store_id;

  -- Check if owner has active pro subscription
  SELECT EXISTS (
    SELECT 1 FROM public.seller_subscriptions
    WHERE user_id = v_store_owner_id AND status = 'active'
  ) INTO v_is_pro;

  -- Set limit: 1 for free, 3 for pro
  v_max_files := CASE WHEN v_is_pro THEN 3 ELSE 1 END;

  -- Count total files (1 for main asset + additional files)
  v_total_files := CASE WHEN NEW.asset_file_url IS NOT NULL AND NEW.asset_file_url != '' THEN 1 ELSE 0 END
    + COALESCE(array_length(NEW.additional_asset_files, 1), 0);

  IF v_total_files > v_max_files THEN
    RAISE EXCEPTION 'File limit exceeded. Your plan allows % file(s) per product.', v_max_files;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS validate_product_files ON public.products;
CREATE TRIGGER validate_product_files
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_product_file_count();
