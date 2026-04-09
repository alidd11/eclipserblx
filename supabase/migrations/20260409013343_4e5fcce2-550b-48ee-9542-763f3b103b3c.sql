GRANT SELECT, INSERT, UPDATE ON TABLE public.seller_payouts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.affiliate_payouts TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.developer_payments TO authenticated;

GRANT SELECT ON TABLE public.seller_payouts_safe TO authenticated;
GRANT SELECT ON TABLE public.seller_payouts_masked TO authenticated;
GRANT SELECT ON TABLE public.affiliate_payouts_safe TO authenticated;
GRANT SELECT ON TABLE public.affiliate_payouts_masked TO authenticated;

GRANT UPDATE ON TABLE public.products TO authenticated;

DROP POLICY IF EXISTS "Staff with product moderation permissions can update products" ON public.products;
CREATE POLICY "Staff with product moderation permissions can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'lead_administrator')
  OR public.has_permission(auth.uid(), 'manage_products')
  OR public.has_permission(auth.uid(), 'manage_seller_stores')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'lead_administrator')
  OR public.has_permission(auth.uid(), 'manage_products')
  OR public.has_permission(auth.uid(), 'manage_seller_stores')
);