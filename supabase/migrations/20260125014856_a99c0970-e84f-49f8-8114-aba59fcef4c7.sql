-- Create custom_roles table for dynamic role management
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  color text NOT NULL DEFAULT 'bg-gray-500',
  icon text NOT NULL DEFAULT 'shield',
  hierarchy_level integer NOT NULL DEFAULT 10,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage custom roles
CREATE POLICY "Anyone can view custom roles"
  ON public.custom_roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage custom roles"
  ON public.custom_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert existing enum roles as system roles for reference
INSERT INTO public.custom_roles (name, display_name, color, icon, hierarchy_level, is_system, description)
VALUES 
  ('admin', 'Admin', 'bg-red-500', 'shield', 100, true, 'Full system access'),
  ('product_manager', 'Product Manager', 'bg-blue-500', 'package', 50, true, 'Manage products and categories'),
  ('order_manager', 'Order Manager', 'bg-green-500', 'file-text', 50, true, 'Manage orders and transactions'),
  ('support_agent', 'Support Agent', 'bg-purple-500', 'message-circle', 30, true, 'Handle customer support'),
  ('analyst', 'Analyst', 'bg-amber-500', 'bar-chart-3', 20, true, 'View analytics and reports'),
  ('recruiter', 'Recruiter', 'bg-cyan-500', 'users', 20, true, 'Manage job applications and outreach')
ON CONFLICT (name) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();