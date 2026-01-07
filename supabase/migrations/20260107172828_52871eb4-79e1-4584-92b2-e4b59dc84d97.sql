-- Add customer_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN customer_id text UNIQUE;

-- Create a function to generate customer IDs
CREATE OR REPLACE FUNCTION public.generate_customer_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_id text;
    id_exists boolean;
BEGIN
    LOOP
        -- Generate ID like: ECL-XXXXXX (6 alphanumeric characters)
        new_id := 'ECL-' || upper(substr(md5(random()::text), 1, 6));
        
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE customer_id = new_id) INTO id_exists;
        
        -- Exit loop if unique
        EXIT WHEN NOT id_exists;
    END LOOP;
    
    RETURN new_id;
END;
$$;

-- Update handle_new_user to include customer_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, display_name, customer_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        generate_customer_id()
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Backfill existing profiles without customer_id
UPDATE public.profiles 
SET customer_id = generate_customer_id() 
WHERE customer_id IS NULL;