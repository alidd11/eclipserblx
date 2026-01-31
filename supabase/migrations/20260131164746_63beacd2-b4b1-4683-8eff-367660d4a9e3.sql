-- Step 1: Add role column with default
ALTER TABLE public.role_permissions ADD COLUMN role text NOT NULL DEFAULT 'admin';

-- Step 2: Remove default
ALTER TABLE public.role_permissions ALTER COLUMN role DROP DEFAULT;

-- Step 3: Add FK constraint
ALTER TABLE public.role_permissions 
ADD CONSTRAINT role_permissions_role_fkey 
FOREIGN KEY (role) REFERENCES public.custom_roles(name) ON DELETE CASCADE;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);