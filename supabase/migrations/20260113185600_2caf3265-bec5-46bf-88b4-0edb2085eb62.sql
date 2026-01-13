-- Add columns to track admin-granted subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grant_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.subscriptions.granted_by IS 'Admin user ID who granted the subscription (null if Stripe subscription)';
COMMENT ON COLUMN public.subscriptions.granted_at IS 'Timestamp when admin granted the subscription';
COMMENT ON COLUMN public.subscriptions.grant_reason IS 'Optional reason for granting the subscription';