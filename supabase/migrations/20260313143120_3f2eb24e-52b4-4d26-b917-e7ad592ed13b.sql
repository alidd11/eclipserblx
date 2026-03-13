-- Atomic download count increment function
CREATE OR REPLACE FUNCTION public.increment_download_count(p_product_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE products
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = p_product_id;
$$;

-- Add temp_file_path column to download_tokens for watermark cleanup
ALTER TABLE public.download_tokens
ADD COLUMN IF NOT EXISTS temp_file_path text;