-- Create Global Guard subscription tiers table
CREATE TABLE public.global_guard_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price_gbp NUMERIC NOT NULL DEFAULT 0,
  annual_price_gbp NUMERIC NOT NULL DEFAULT 0,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  stripe_monthly_product_id TEXT,
  stripe_annual_product_id TEXT,
  max_servers INTEGER,
  has_priority_sync BOOLEAN NOT NULL DEFAULT false,
  has_ban_templates BOOLEAN NOT NULL DEFAULT false,
  features JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Global Guard subscriptions table  
CREATE TABLE public.global_guard_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL REFERENCES public.global_guard_tiers(tier),
  status TEXT NOT NULL DEFAULT 'active',
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.global_guard_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_guard_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for tiers (public read)
CREATE POLICY "Anyone can view active tiers"
ON public.global_guard_tiers FOR SELECT
USING (is_active = true);

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.global_guard_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
ON public.global_guard_subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- Insert the premium tier
INSERT INTO public.global_guard_tiers (tier, name, description, monthly_price_gbp, annual_price_gbp, stripe_monthly_price_id, stripe_annual_price_id, stripe_monthly_product_id, stripe_annual_product_id, max_servers, has_priority_sync, has_ban_templates, features, display_order)
VALUES (
  'premium',
  'Global Guard Premium',
  'Unlimited servers, priority sync, and ban templates',
  2.99,
  24.99,
  'price_1SyeCoCjEHxHwNl9YROPHdNC',
  'price_1SyeE3CjEHxHwNl9m0vhAp2g',
  'prod_TwXHRni0JSL5kz',
  'prod_TwXI5ATJKQ8h8t',
  NULL,
  true,
  true,
  '["Unlimited servers", "Priority sync (100ms)", "Ban templates", "Advanced analytics", "Priority support"]'::jsonb,
  1
);

-- Add trigger for updated_at
CREATE TRIGGER update_global_guard_tiers_updated_at
BEFORE UPDATE ON public.global_guard_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_guard_subscriptions_updated_at
BEFORE UPDATE ON public.global_guard_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();