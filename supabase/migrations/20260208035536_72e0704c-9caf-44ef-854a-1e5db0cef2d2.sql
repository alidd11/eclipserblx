-- Add is_status_role flag to categorize system/status roles
ALTER TABLE public.custom_roles 
ADD COLUMN is_status_role boolean NOT NULL DEFAULT false;

-- Mark existing status roles
UPDATE public.custom_roles 
SET is_status_role = true 
WHERE name IN ('seller', 'eclipse_plus_member', 'customer');

-- Add comment for clarity
COMMENT ON COLUMN public.custom_roles.is_status_role IS 'True for system-managed status roles (customer, seller, eclipse_plus_member) that should be hidden from admin role management UI';