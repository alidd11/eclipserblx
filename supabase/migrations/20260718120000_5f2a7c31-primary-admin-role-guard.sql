-- Close a privilege-escalation gap: can_assign_role() only compared hierarchy
-- levels, so any user holding the 'admin' role could grant or revoke the
-- 'admin' role on any account (including the platform's primary admin).
-- Per the documented staff-role-management design, only the primary admin
-- account may assign/remove the 'admin' role itself.
CREATE OR REPLACE FUNCTION public.can_assign_role(_assigner_id uuid, _target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _target_role = 'admin' THEN
        public.get_user_email(_assigner_id) = 'alicanimir1@gmail.com'
      ELSE
        public.get_user_max_hierarchy(_assigner_id) >= (
          SELECT hierarchy_level FROM public.custom_roles WHERE name = _target_role
        )
    END
$$;
