-- Create permissions table to define all available permissions
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role_permissions table to link roles to permissions
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions table: anyone can read, only admins can modify
CREATE POLICY "Anyone can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Role permissions: anyone can read, only admins can modify
CREATE POLICY "Anyone can view role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create helper function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.name = _permission_name
  )
$$;

-- Insert default permissions (Page Access)
INSERT INTO public.permissions (name, description, category) VALUES
  -- Dashboard & Analytics
  ('view_dashboard', 'Access the admin dashboard', 'pages'),
  ('view_analytics', 'Access analytics page', 'pages'),
  ('view_income', 'Access income/revenue page', 'pages'),
  
  -- User Management
  ('view_users', 'Access users list', 'pages'),
  ('manage_users', 'Edit and manage user accounts', 'actions'),
  ('delete_users', 'Delete user accounts', 'actions'),
  ('manage_user_roles', 'Assign and revoke user roles', 'actions'),
  
  -- Product Management
  ('view_products', 'Access products list', 'pages'),
  ('manage_products', 'Create, edit, and delete products', 'actions'),
  ('view_orders', 'Access orders list', 'pages'),
  ('manage_orders', 'Process and manage orders', 'actions'),
  
  -- Support & Communication
  ('view_live_chat', 'Access live chat support', 'pages'),
  ('respond_to_chat', 'Respond to customer chats', 'actions'),
  ('view_contact_messages', 'Access contact form messages', 'pages'),
  ('respond_to_contacts', 'Reply to contact messages', 'actions'),
  ('view_seller_tickets', 'Access seller support tickets', 'pages'),
  ('manage_seller_tickets', 'Handle seller support tickets', 'actions'),
  
  -- Marketplace & Sellers
  ('view_seller_stores', 'Access seller stores list', 'pages'),
  ('manage_seller_stores', 'Manage seller store settings', 'actions'),
  ('view_seller_payouts', 'Access seller payouts', 'pages'),
  ('process_payouts', 'Process seller payouts', 'actions'),
  ('view_store_applications', 'Access store applications', 'pages'),
  ('review_store_applications', 'Approve/reject store applications', 'actions'),
  
  -- Affiliates
  ('view_affiliates', 'Access affiliates list', 'pages'),
  ('manage_affiliates', 'Manage affiliate settings', 'actions'),
  ('view_affiliate_applications', 'Access affiliate applications', 'pages'),
  ('review_affiliate_applications', 'Approve/reject affiliate applications', 'actions'),
  
  -- Staff Management
  ('view_staff_directory', 'Access staff directory', 'pages'),
  ('view_staff_activity', 'Access staff activity logs', 'pages'),
  ('manage_staff', 'Manage staff members', 'actions'),
  ('view_audit_logs', 'Access audit logs', 'pages'),
  
  -- Recruitment
  ('view_applications', 'Access job applications', 'pages'),
  ('review_applications', 'Review and respond to applications', 'actions'),
  ('view_job_channels', 'Access job channels', 'pages'),
  ('manage_job_channels', 'Create and edit job listings', 'actions'),
  
  -- Content & Marketing
  ('view_reviews', 'Access reviews list', 'pages'),
  ('manage_reviews', 'Approve/reject reviews', 'actions'),
  ('view_discounts', 'Access discount codes', 'pages'),
  ('manage_discounts', 'Create and manage discount codes', 'actions'),
  ('view_forum_reports', 'Access forum reports', 'pages'),
  ('manage_forum_reports', 'Handle forum reports', 'actions'),
  
  -- System & Settings
  ('view_settings', 'Access admin settings', 'pages'),
  ('manage_settings', 'Modify system settings', 'actions'),
  ('view_incidents', 'Access incidents/status page', 'pages'),
  ('manage_incidents', 'Create and manage incidents', 'actions'),
  ('view_ip_bans', 'Access IP bans list', 'pages'),
  ('manage_ip_bans', 'Create and remove IP bans', 'actions'),
  ('view_bot_codes', 'Access bot installation codes', 'pages'),
  ('manage_bot_codes', 'Process bot installation requests', 'actions'),
  
  -- Subscriptions
  ('view_subscribers', 'Access subscribers list', 'pages'),
  ('manage_subscriptions', 'Manage user subscriptions', 'actions'),
  
  -- Referrals
  ('view_referrals', 'Access referrals list', 'pages'),
  ('manage_referrals', 'Manage referral settings', 'actions'),
  
  -- Role Permissions (Meta)
  ('view_permissions', 'Access role permissions page', 'pages'),
  ('manage_permissions', 'Modify role permissions', 'actions');

-- Grant all permissions to admin role by default
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions;

-- Grant typical permissions to other roles
-- Product Manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'product_manager', id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_products', 'manage_products', 'view_orders', 'manage_orders', 'view_reviews', 'manage_reviews');

-- Order Manager
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'order_manager', id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_orders', 'manage_orders', 'view_users', 'view_seller_payouts', 'process_payouts');

-- Support Agent
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'support_agent', id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_live_chat', 'respond_to_chat', 'view_contact_messages', 'respond_to_contacts', 'view_seller_tickets', 'manage_seller_tickets', 'view_users', 'view_orders', 'view_forum_reports', 'manage_forum_reports');

-- Analyst
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'analyst', id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_analytics', 'view_income', 'view_users', 'view_orders', 'view_referrals', 'view_subscribers');

-- Recruiter
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'recruiter', id FROM public.permissions 
WHERE name IN ('view_dashboard', 'view_applications', 'review_applications', 'view_job_channels', 'manage_job_channels');