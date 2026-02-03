-- Add RLS policy for admins to manage settings
CREATE POLICY "Admins can manage all settings" 
ON public.settings 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));