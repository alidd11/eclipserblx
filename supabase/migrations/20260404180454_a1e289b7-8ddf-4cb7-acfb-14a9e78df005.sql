
-- Phase 1: Add is_default column to custom_roles
ALTER TABLE public.custom_roles ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Set 'customer' as the default role
UPDATE public.custom_roles SET is_default = true WHERE name = 'customer';

-- Phase 2: Insert scoped manage_role permissions for each non-status staff role
INSERT INTO public.permissions (name, description, category)
VALUES
  ('manage_role:admin', 'Can assign/remove the Admin role', 'users'),
  ('manage_role:c', 'Can assign/remove the COO role', 'users'),
  ('manage_role:developer', 'Can assign/remove the Developer role', 'users'),
  ('manage_role:analyst', 'Can assign/remove the Analyst role', 'users'),
  ('manage_role:lead_administrator', 'Can assign/remove the Lead Administrator role', 'users'),
  ('manage_role:lead_manager', 'Can assign/remove the Lead Manager role', 'users'),
  ('manage_role:recruiter', 'Can assign/remove the Recruiter role', 'users'),
  ('manage_role:support_agent', 'Can assign/remove the Support Agent role', 'users')
ON CONFLICT (name) DO NOTHING;

-- Phase 3: Grant all manage_role permissions to admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', p.id
FROM public.permissions p
WHERE p.name LIKE 'manage_role:%'
ON CONFLICT DO NOTHING;

-- Phase 4: Create can_create_role function for bounded role creation
CREATE OR REPLACE FUNCTION public.can_create_role(
  _creator_id uuid,
  _new_hierarchy_level integer,
  _new_permission_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_max_hierarchy integer;
  creator_permission_count integer;
  requested_permission_count integer;
BEGIN
  -- Get creator's max hierarchy level
  creator_max_hierarchy := public.get_user_max_hierarchy(_creator_id);
  
  -- New role hierarchy must be <= creator's
  IF _new_hierarchy_level > creator_max_hierarchy THEN
    RETURN false;
  END IF;
  
  -- If no permissions requested, allow
  IF array_length(_new_permission_ids, 1) IS NULL THEN
    RETURN true;
  END IF;
  
  -- Count how many of the requested permissions the creator actually has
  SELECT COUNT(*) INTO creator_permission_count
  FROM unnest(_new_permission_ids) AS requested_perm_id
  WHERE EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _creator_id
      AND rp.permission_id = requested_perm_id
  );
  
  requested_permission_count := array_length(_new_permission_ids, 1);
  
  -- All requested permissions must be ones the creator has
  RETURN creator_permission_count >= requested_permission_count;
END;
$$;

-- Phase 5: Create function to check scoped role management permission
CREATE OR REPLACE FUNCTION public.can_manage_specific_role(_user_id uuid, _target_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin can manage all roles
  SELECT 
    public.has_role(_user_id, 'admin')
    OR public.has_permission(_user_id, 'manage_role:' || _target_role)
$$;

-- Phase 6: Auto-assign default roles on new profile creation
CREATE OR REPLACE FUNCTION public.assign_default_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.user_id, cr.name
  FROM public.custom_roles cr
  WHERE cr.is_default = true
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS assign_default_roles_on_profile ON public.profiles;
CREATE TRIGGER assign_default_roles_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_roles();
