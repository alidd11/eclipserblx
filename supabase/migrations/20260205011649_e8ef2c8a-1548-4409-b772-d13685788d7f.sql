-- Add policy allowing developers to view their own payment records
CREATE POLICY "Developers can view own payments"
ON public.developer_payments
FOR SELECT
USING (auth.uid() = developer_id);