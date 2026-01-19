-- Add affiliate_id column to affiliate_applications table
ALTER TABLE public.affiliate_applications 
ADD COLUMN affiliate_id TEXT UNIQUE;

-- Create function to generate affiliate ID (similar to customer_id)
CREATE OR REPLACE FUNCTION public.generate_affiliate_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_id TEXT;
    id_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate ID like: AFF-XXXXXX (6 alphanumeric characters)
        new_id := 'AFF-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
        
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM public.affiliate_applications WHERE affiliate_id = new_id) INTO id_exists;
        
        -- Exit loop if unique
        EXIT WHEN NOT id_exists;
    END LOOP;
    
    RETURN new_id;
END;
$$;

-- Create trigger to auto-assign affiliate_id on insert
CREATE OR REPLACE FUNCTION public.set_affiliate_application_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.affiliate_id IS NULL THEN
        NEW.affiliate_id := generate_affiliate_id();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_affiliate_id
BEFORE INSERT ON public.affiliate_applications
FOR EACH ROW
EXECUTE FUNCTION public.set_affiliate_application_id();

-- Backfill existing applications with affiliate IDs
UPDATE public.affiliate_applications
SET affiliate_id = generate_affiliate_id()
WHERE affiliate_id IS NULL;