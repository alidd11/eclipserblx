-- Step 1: Drop dependent RLS policies first
DROP POLICY IF EXISTS "Staff can manage discord outreach" ON public.discord_outreach;
DROP POLICY IF EXISTS "Users can assign roles at or below their level" ON public.user_roles;
DROP POLICY IF EXISTS "Users can remove roles at or below their level" ON public.user_roles;

-- Step 2: Drop the unique constraint that uses the old column
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Step 3: Add a new text column for role
ALTER TABLE public.user_roles ADD COLUMN role_name text;

-- Step 4: Copy existing enum values to the new column
UPDATE public.user_roles SET role_name = role::text;

-- Step 5: Drop the old enum column
ALTER TABLE public.user_roles DROP COLUMN role;

-- Step 6: Rename the new column to 'role'
ALTER TABLE public.user_roles RENAME COLUMN role_name TO role;

-- Step 7: Make role NOT NULL and add unique constraint
ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role);

-- Step 8: Add foreign key to custom_roles (referencing by name)
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_fkey 
FOREIGN KEY (role) REFERENCES public.custom_roles(name) ON DELETE CASCADE;

-- Step 9: Update has_role function to use text
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 10: Update can_assign_role to use text and custom_roles hierarchy
CREATE OR REPLACE FUNCTION public.can_assign_role(_assigner_id uuid, _target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_max_hierarchy(_assigner_id) >= (
    SELECT hierarchy_level FROM public.custom_roles WHERE name = _target_role
  )
$$;

-- Step 11: Update get_user_max_hierarchy to use custom_roles
CREATE OR REPLACE FUNCTION public.get_user_max_hierarchy(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(cr.hierarchy_level), 0)
  FROM public.user_roles ur
  JOIN public.custom_roles cr ON cr.name = ur.role
  WHERE ur.user_id = _user_id
$$;

-- Step 12: Recreate RLS policies with text-based role column
CREATE POLICY "Users can assign roles at or below their level" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.can_assign_role(auth.uid(), role));

CREATE POLICY "Users can remove roles at or below their level" ON public.user_roles
FOR DELETE TO authenticated
USING (public.can_assign_role(auth.uid(), role));

CREATE POLICY "Staff can manage discord outreach" ON public.discord_outreach
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()));

-- Step 13: Drop the old role_hierarchy table (no longer needed)
DROP TABLE IF EXISTS public.role_hierarchy;

-- Step 14: Drop the old app_role enum type
DROP TYPE IF EXISTS public.app_role CASCADE;