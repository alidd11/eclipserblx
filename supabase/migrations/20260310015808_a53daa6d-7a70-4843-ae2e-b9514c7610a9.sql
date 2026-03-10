
-- 1. Add dispute_number column
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS dispute_number text UNIQUE;

-- 2. Generator function
CREATE OR REPLACE FUNCTION public.generate_dispute_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  number_exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'DSP-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    SELECT EXISTS(SELECT 1 FROM refund_requests WHERE dispute_number = new_number) INTO number_exists;
    EXIT WHEN NOT number_exists;
  END LOOP;
  RETURN new_number;
END;
$$;

-- 3. Auto-assign trigger
CREATE OR REPLACE FUNCTION public.set_dispute_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.dispute_number IS NULL THEN
    NEW.dispute_number := generate_dispute_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_dispute_number
  BEFORE INSERT ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_dispute_number();

-- 4. Backfill existing disputes
UPDATE public.refund_requests
SET dispute_number = 'DSP-' || UPPER(SUBSTR(MD5(id::text), 1, 6))
WHERE dispute_number IS NULL;
