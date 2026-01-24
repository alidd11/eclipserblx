-- Add hierarchy_level to track role privilege levels
-- Higher number = more privileged (admin = highest)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0;

-- Create a lookup table for role hierarchy levels
CREATE TABLE IF NOT EXISTS public.role_hierarchy (
  role app_role PRIMARY KEY,
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert hierarchy levels for existing roles
-- Admin = 100 (highest), then descending
INSERT INTO public.role_hierarchy (role, hierarchy_level) VALUES
  ('admin', 100),
  ('product_manager', 50),
  ('order_manager', 50),
  ('support_agent', 30),
  ('analyst', 30),
  ('recruiter', 30),
  ('seller', 10)
ON CONFLICT (role) DO UPDATE SET hierarchy_level = EXCLUDED.hierarchy_level;

-- Enable RLS on role_hierarchy
ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read hierarchy levels
CREATE POLICY "Anyone can read role hierarchy"
ON public.role_hierarchy
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify hierarchy levels
CREATE POLICY "Only admins can modify role hierarchy"
ON public.role_hierarchy
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to get user's maximum hierarchy level
CREATE OR REPLACE FUNCTION public.get_user_max_hierarchy(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(rh.hierarchy_level), 0)
  FROM public.user_roles ur
  JOIN public.role_hierarchy rh ON rh.role = ur.role
  WHERE ur.user_id = _user_id
$$;

-- Function to check if a user can assign a specific role
CREATE OR REPLACE FUNCTION public.can_assign_role(_assigner_id uuid, _target_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_max_hierarchy(_assigner_id) >= (
    SELECT hierarchy_level FROM public.role_hierarchy WHERE role = _target_role
  )
$$;

-- Function to check if user can manage another user's roles
CREATE OR REPLACE FUNCTION public.can_manage_user_roles(_assigner_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Can only manage users with lower or equal hierarchy
  SELECT public.get_user_max_hierarchy(_assigner_id) >= public.get_user_max_hierarchy(_target_user_id)
$$;

-- Update user_roles RLS to enforce hierarchy
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Admins and users with sufficient hierarchy can view roles
CREATE POLICY "Staff can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.is_staff(auth.uid())
);

-- Only users with sufficient hierarchy can insert roles
CREATE POLICY "Users can assign roles at or below their level"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR (
    public.is_staff(auth.uid()) AND
    public.can_assign_role(auth.uid(), role) AND
    public.can_manage_user_roles(auth.uid(), user_id)
  )
);

-- Only users with sufficient hierarchy can delete roles
CREATE POLICY "Users can remove roles at or below their level"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR (
    public.is_staff(auth.uid()) AND
    public.can_assign_role(auth.uid(), role) AND
    public.can_manage_user_roles(auth.uid(), user_id)
  )
);