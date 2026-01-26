-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('basic', 'pro', 'premium');

-- Create subscription billing period enum  
CREATE TYPE public.subscription_billing_period AS ENUM ('monthly', 'annual');

-- Add tier and billing period to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS tier subscription_tier DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS billing_period subscription_billing_period DEFAULT 'monthly';

-- Create subscription_tiers configuration table
CREATE TABLE public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_percentage INTEGER NOT NULL DEFAULT 0,
  free_products_per_month INTEGER NOT NULL DEFAULT 0,
  monthly_price_gbp NUMERIC(10,2) NOT NULL,
  annual_price_gbp NUMERIC(10,2) NOT NULL,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Public read access for tiers (needed for pricing page)
CREATE POLICY "Anyone can view active subscription tiers"
  ON public.subscription_tiers FOR SELECT
  USING (is_active = true);

-- Staff can manage tiers
CREATE POLICY "Staff can manage subscription tiers"
  ON public.subscription_tiers FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Insert default tiers
INSERT INTO public.subscription_tiers (tier, name, description, discount_percentage, free_products_per_month, monthly_price_gbp, annual_price_gbp, display_order, features) VALUES
('basic', 'Eclipse Basic', 'Perfect for casual users', 15, 0, 2.99, 29.90, 1, '["15% off all purchases", "Early access to new products", "Basic support priority"]'::jsonb),
('pro', 'Eclipse Pro', 'Best value for regular shoppers', 30, 1, 4.99, 49.90, 2, '["30% off all purchases", "1 free product per month", "Priority support", "Exclusive Pro badges"]'::jsonb),
('premium', 'Eclipse Premium', 'Ultimate benefits for power users', 50, 2, 9.99, 99.90, 3, '["50% off all purchases", "2 free products per month", "VIP Discord role", "Early beta access", "Premium support"]'::jsonb);

-- Add updated_at trigger
CREATE TRIGGER update_subscription_tiers_updated_at
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_subscription_tiers_tier ON public.subscription_tiers(tier);
CREATE INDEX idx_subscription_tiers_active ON public.subscription_tiers(is_active);