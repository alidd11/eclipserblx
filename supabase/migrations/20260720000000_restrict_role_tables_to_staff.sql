-- custom_roles and role_permissions were readable by any authenticated user
-- (qual: "true"), exposing the full admin role hierarchy and permission
-- matrix to customers. Every consumer of these tables in the app
-- (RolePermissions/StaffDirectory/InternalMessages/StaffChatRoom admin pages,
-- useUserPermissions, useChatRoles) is staff-gated, so there is no
-- customer-facing dependency on the broad read policy.

DROP POLICY "Authenticated users can view custom roles" ON public.custom_roles;
CREATE POLICY "Staff can view custom roles"
ON public.custom_roles
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY "Anyone can view role permissions" ON public.role_permissions;
CREATE POLICY "Staff can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));
