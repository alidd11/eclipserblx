CREATE POLICY "Public can check agreement existence"
ON public.seller_agreements
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = seller_agreements.store_id
      AND stores.status = 'approved'
      AND stores.is_active = true
  )
);