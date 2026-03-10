
-- 1. Fix RLS policies on user_roles: change manage_roles → manage_user_roles
DROP POLICY IF EXISTS "Staff can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can remove roles" ON public.user_roles;

CREATE POLICY "Staff can assign roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'manage_user_roles')
    AND public.can_assign_role(auth.uid(), role)
    AND public.can_manage_user_roles(auth.uid(), user_id)
  );

CREATE POLICY "Staff can remove roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'manage_user_roles')
    AND public.can_assign_role(auth.uid(), role)
    AND public.can_manage_user_roles(auth.uid(), user_id)
  );

-- 2. Rename order_manager → lead_manager (CASCADE will update user_roles and role_permissions)
UPDATE public.custom_roles
  SET name = 'lead_manager',
      display_name = 'Lead Manager',
      updated_at = now()
  WHERE name = 'order_manager';

-- 3. Restrict custom_roles SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Custom roles are viewable by everyone" ON public.custom_roles;

CREATE POLICY "Authenticated users can view custom roles"
  ON public.custom_roles FOR SELECT TO authenticated
  USING (true);
