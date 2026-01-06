-- Add RLS policy for order deletion (only for primary admin email)
CREATE POLICY "Owner can delete orders"
ON public.orders
FOR DELETE
USING (EXISTS (
  SELECT 1
  FROM profiles
  WHERE profiles.user_id = auth.uid()
    AND profiles.email = 'alicanimir1@gmail.com'
));