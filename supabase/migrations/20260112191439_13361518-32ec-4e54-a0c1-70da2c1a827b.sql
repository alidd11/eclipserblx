-- Drop the overly permissive staff policy
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Create role-specific policies for profile access
CREATE POLICY "Admin can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Support agent can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.has_role(auth.uid(), 'support_agent'));

CREATE POLICY "Order manager can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.has_role(auth.uid(), 'order_manager'));