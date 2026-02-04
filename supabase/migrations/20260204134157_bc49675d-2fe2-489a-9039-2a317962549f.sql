-- Add Customer role to custom_roles
INSERT INTO public.custom_roles (name, display_name, description, hierarchy_level, is_system, icon, color)
VALUES ('customer', 'Customer', 'Default role for all registered users', 1, true, 'User', '#6366F1')
ON CONFLICT (name) DO NOTHING;

-- Create trigger function to assign customer role on new user registration
CREATE OR REPLACE FUNCTION public.assign_customer_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Assign customer role to new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (fires after new profile is created)
DROP TRIGGER IF EXISTS on_profile_created_assign_customer ON public.profiles;
CREATE TRIGGER on_profile_created_assign_customer
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_customer_role();

-- Assign customer role to all existing users who don't have it
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'customer'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id AND ur.role = 'customer'
)
ON CONFLICT (user_id, role) DO NOTHING;