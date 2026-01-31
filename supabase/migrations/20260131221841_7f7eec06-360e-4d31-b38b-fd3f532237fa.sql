-- First, remove any duplicate role-permission entries if they exist
DELETE FROM public.role_permissions a
USING public.role_permissions b
WHERE a.id > b.id 
  AND a.role = b.role 
  AND a.permission_id = b.permission_id;

-- Add unique constraint to prevent duplicate role-permission assignments
ALTER TABLE public.role_permissions 
ADD CONSTRAINT role_permissions_role_permission_unique UNIQUE (role, permission_id);