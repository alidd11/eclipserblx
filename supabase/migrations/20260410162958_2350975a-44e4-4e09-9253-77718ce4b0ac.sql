CREATE POLICY "Anyone can check agreement existence"
ON public.seller_agreements
FOR SELECT
TO anon, authenticated
USING (true);