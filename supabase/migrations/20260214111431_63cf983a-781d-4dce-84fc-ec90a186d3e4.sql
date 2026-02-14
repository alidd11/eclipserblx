
-- Public can read discount codes (checkout, homepage offers)
CREATE POLICY "Anyone can view discount codes"
  ON public.discount_codes FOR SELECT
  USING (true);

-- Staff can create discount codes
CREATE POLICY "Staff can create discount codes"
  ON public.discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- Staff can update discount codes
CREATE POLICY "Staff can update discount codes"
  ON public.discount_codes FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Staff can delete discount codes
CREATE POLICY "Staff can delete discount codes"
  ON public.discount_codes FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));
