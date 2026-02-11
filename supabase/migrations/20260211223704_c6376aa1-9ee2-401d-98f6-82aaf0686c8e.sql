-- Allow sellers to delete their own products
CREATE POLICY "Sellers can delete own products"
ON public.products
FOR DELETE
USING (store_id IN (
  SELECT stores.id FROM stores WHERE stores.owner_id = auth.uid()
));

-- Allow staff to delete any product
CREATE POLICY "Staff can delete any product"
ON public.products
FOR DELETE
USING (is_staff(auth.uid()));
