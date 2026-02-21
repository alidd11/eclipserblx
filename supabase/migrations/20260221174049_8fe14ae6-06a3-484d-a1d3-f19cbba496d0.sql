-- Allow admins/staff to update products for moderation
CREATE POLICY "Admins can update any product"
ON public.products
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'lead_administrator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'lead_administrator')
);