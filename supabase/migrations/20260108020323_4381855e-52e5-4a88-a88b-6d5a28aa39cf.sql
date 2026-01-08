-- Create email subscriptions table
CREATE TABLE public.email_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL,
    subscribed_to_updates BOOLEAN NOT NULL DEFAULT true,
    subscribed_to_discounts BOOLEAN NOT NULL DEFAULT true,
    subscribed_to_newsletters BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id),
    UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.email_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription
CREATE POLICY "Users can insert their own subscription"
ON public.email_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update their own subscription"
ON public.email_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Staff can view all subscriptions
CREATE POLICY "Staff can view all subscriptions"
ON public.email_subscriptions
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_email_subscriptions_updated_at
BEFORE UPDATE ON public.email_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();