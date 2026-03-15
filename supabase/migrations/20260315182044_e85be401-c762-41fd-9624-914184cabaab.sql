-- Add staff INSERT policy for products table
CREATE POLICY "Staff can create products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()));

-- Fix staff storage upload policy: change from public to authenticated
DROP POLICY IF EXISTS "Staff can upload product images" ON storage.objects;
CREATE POLICY "Staff can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND is_staff(auth.uid()));

-- Also add team member INSERT policy for products (team members should be able to create products too)
CREATE POLICY "Team members can create products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_team_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- Add team member storage upload policy
CREATE POLICY "Team members can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM store_team_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );