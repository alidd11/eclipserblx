
-- 1. Fix is_staff() to exclude status roles (matching frontend logic)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.custom_roles cr ON cr.name = ur.role
    WHERE ur.user_id = _user_id
      AND cr.is_status_role = false
  )
$$;

-- 2. Remove orphaned discord outreach permissions
DELETE FROM public.role_permissions
WHERE permission_id IN (
  SELECT id FROM public.permissions WHERE name IN ('manage_discord_outreach', 'view_discord_outreach')
);

DELETE FROM public.permissions
WHERE name IN ('manage_discord_outreach', 'view_discord_outreach');
