-- Add support reply notification preference column
ALTER TABLE public.email_subscriptions 
ADD COLUMN IF NOT EXISTS subscribed_to_support_replies boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.email_subscriptions.subscribed_to_support_replies IS 'Whether user wants push notifications for support message replies';