-- Add staff_id column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_id text UNIQUE;

-- Create function to generate unique staff IDs (format: STF-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_staff_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_id text;
    id_exists boolean;
BEGIN
    LOOP
        -- Generate ID like: STF-XXXXXX (6 alphanumeric characters)
        new_id := 'STF-' || upper(substr(md5(random()::text), 1, 6));
        
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE staff_id = new_id) INTO id_exists;
        
        -- Exit loop if unique
        EXIT WHEN NOT id_exists;
    END LOOP;
    
    RETURN new_id;
END;
$$;

-- Create function to assign staff_id when user gets their first role
CREATE OR REPLACE FUNCTION public.assign_staff_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user already has a staff_id
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.user_id AND staff_id IS NOT NULL) THEN
        -- Assign a new staff_id
        UPDATE public.profiles 
        SET staff_id = generate_staff_id() 
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger to auto-assign staff_id when a role is added
DROP TRIGGER IF EXISTS on_role_assigned ON public.user_roles;
CREATE TRIGGER on_role_assigned
    AFTER INSERT ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_staff_id();

-- Create staff_id_log table to track staff ID assignments
CREATE TABLE IF NOT EXISTS public.staff_id_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    staff_id text NOT NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assigned_by uuid,
    notes text
);

-- Enable RLS on staff_id_logs
ALTER TABLE public.staff_id_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view staff ID logs
CREATE POLICY "Admins can view staff ID logs"
ON public.staff_id_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert staff ID logs
CREATE POLICY "Admins can insert staff ID logs"
ON public.staff_id_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update the assign_staff_id function to also log the assignment
CREATE OR REPLACE FUNCTION public.assign_staff_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_staff_id text;
BEGIN
    -- Check if user already has a staff_id
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.user_id AND staff_id IS NOT NULL) THEN
        -- Generate new staff_id
        new_staff_id := generate_staff_id();
        
        -- Assign the new staff_id
        UPDATE public.profiles 
        SET staff_id = new_staff_id 
        WHERE user_id = NEW.user_id;
        
        -- Log the assignment
        INSERT INTO public.staff_id_logs (user_id, staff_id, notes)
        VALUES (NEW.user_id, new_staff_id, 'Auto-assigned on first role: ' || NEW.role::text);
    END IF;
    RETURN NEW;
END;
$$;

-- Assign staff IDs to existing staff members who don't have one
DO $$
DECLARE
    staff_record RECORD;
    new_staff_id text;
BEGIN
    FOR staff_record IN 
        SELECT DISTINCT ur.user_id 
        FROM public.user_roles ur
        JOIN public.profiles p ON p.user_id = ur.user_id
        WHERE p.staff_id IS NULL
    LOOP
        new_staff_id := public.generate_staff_id();
        
        UPDATE public.profiles 
        SET staff_id = new_staff_id 
        WHERE user_id = staff_record.user_id;
        
        INSERT INTO public.staff_id_logs (user_id, staff_id, notes)
        VALUES (staff_record.user_id, new_staff_id, 'Retroactively assigned to existing staff');
    END LOOP;
END;
$$;