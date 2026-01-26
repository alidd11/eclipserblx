-- Create advertisement_tiers table to store tier configuration
CREATE TABLE public.advertisement_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  ads_per_month INTEGER NOT NULL DEFAULT 1,
  monthly_price_gbp NUMERIC(10,2) NOT NULL,
  annual_price_gbp NUMERIC(10,2) NOT NULL,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create advertisement_subscriptions table to track user subscriptions
CREATE TABLE public.advertisement_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  billing_period TEXT DEFAULT 'monthly',
  ads_used_this_month INTEGER DEFAULT 0,
  ads_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.advertisement_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for advertisement_tiers (public read)
CREATE POLICY "Anyone can view active advertisement tiers"
  ON public.advertisement_tiers
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff can manage advertisement tiers"
  ON public.advertisement_tiers
  FOR ALL
  USING (public.is_staff(auth.uid()));

-- RLS policies for advertisement_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.advertisement_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.advertisement_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.advertisement_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all subscriptions"
  ON public.advertisement_subscriptions
  FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage all subscriptions"
  ON public.advertisement_subscriptions
  FOR ALL
  USING (public.is_staff(auth.uid()));

-- Insert the tier data with Stripe price IDs
INSERT INTO public.advertisement_tiers (tier, name, description, ads_per_month, monthly_price_gbp, annual_price_gbp, stripe_monthly_price_id, stripe_annual_price_id, features, display_order)
VALUES
  ('basic', 'Basic', 'Perfect for occasional advertisers', 3, 1.99, 19.99, 'price_1SttzSCjEHxHwNl9UHABm76P', 'price_1Stu02CjEHxHwNl9zVFtnEK8', '["3 Discord ads per month", "Standard embed formatting", "24-hour posting"]'::jsonb, 1),
  ('pro', 'Pro', 'Great for regular promoters', 10, 4.99, 49.99, 'price_1Stu17CjEHxHwNl9CG4LHcNQ', 'price_1Stu1dCjEHxHwNl9FsDlCc4g', '["10 Discord ads per month", "Priority embed formatting", "Instant posting", "Image support"]'::jsonb, 2),
  ('premium', 'Premium', 'Maximum exposure for power users', 30, 9.99, 99.99, 'price_1Stu2FCjEHxHwNl9JtlqWHFx', 'price_1Stu2SCjEHxHwNl9tNsxoyHk', '["30 Discord ads per month", "Premium embed styling", "Instant posting", "Image & link support", "Featured placement"]'::jsonb, 3);

-- Add trigger for updated_at
CREATE TRIGGER update_advertisement_tiers_updated_at
  BEFORE UPDATE ON public.advertisement_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advertisement_subscriptions_updated_at
  BEFORE UPDATE ON public.advertisement_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();