-- Add policy for all other staff to see limited profile info (customer_id and display_name only)
-- They can SELECT from the table, but the application should only query these fields
CREATE POLICY "Staff can view limited profile info" 
ON public.profiles FOR SELECT 
USING (
  public.is_staff(auth.uid()) 
  AND NOT public.has_role(auth.uid(), 'admin')
  AND NOT public.has_role(auth.uid(), 'support_agent')
  AND NOT public.has_role(auth.uid(), 'order_manager')
);

-- Add a comment to document which fields should be exposed
COMMENT ON POLICY "Staff can view limited profile info" ON public.profiles IS 
'Allows product_manager, analyst, recruiter to access rows but application should only query customer_id and display_name fields';