-- Add RLS policies for role_permissions table to allow admins to manage permissions

-- Policy for admins to insert role permissions
CREATE POLICY "Admins can insert role permissions"
ON public.role_permissions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy for admins to delete role permissions
CREATE POLICY "Admins can delete role permissions"
ON public.role_permissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy for admins to update role permissions (if needed)
CREATE POLICY "Admins can update role permissions"
ON public.role_permissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));