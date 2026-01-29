
-- Create enum for license status
CREATE TYPE public.bot_license_status AS ENUM ('pending', 'active', 'expired', 'revoked');

-- Create bot_products table to link products to Discord bot configurations
CREATE TABLE public.bot_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  discord_application_id TEXT NOT NULL,
  discord_permissions BIGINT NOT NULL DEFAULT 8, -- Default to Administrator for simplicity
  oauth_scopes TEXT[] NOT NULL DEFAULT ARRAY['bot', 'applications.commands'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Add new columns to bot_installation_codes for self-service activation
ALTER TABLE public.bot_installation_codes 
ADD COLUMN IF NOT EXISTS guild_id TEXT,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS license_status public.bot_license_status NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bot_product_id UUID REFERENCES public.bot_products(id);

-- Create bot_guild_settings table for per-server configuration
CREATE TABLE public.bot_guild_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  bot_product_id UUID REFERENCES public.bot_products(id) ON DELETE CASCADE NOT NULL,
  installation_code_id UUID REFERENCES public.bot_installation_codes(id) ON DELETE CASCADE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  prefix TEXT DEFAULT '!',
  enabled_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  disabled_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guild_id, bot_product_id)
);

-- Enable RLS on new tables
ALTER TABLE public.bot_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_guild_settings ENABLE ROW LEVEL SECURITY;

-- bot_products policies (public read for active products, admin write)
CREATE POLICY "Anyone can view active bot products"
ON public.bot_products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage bot products"
ON public.bot_products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- bot_guild_settings policies
CREATE POLICY "Users can view their own guild settings"
ON public.bot_guild_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bot_installation_codes bic
    WHERE bic.id = installation_code_id
    AND bic.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own guild settings"
ON public.bot_guild_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bot_installation_codes bic
    WHERE bic.id = installation_code_id
    AND bic.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all guild settings"
ON public.bot_guild_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update bot_installation_codes policies for self-service
CREATE POLICY "Users can view activated status of their codes"
ON public.bot_installation_codes
FOR SELECT
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_products_product_id ON public.bot_products(product_id);
CREATE INDEX IF NOT EXISTS idx_bot_guild_settings_guild_id ON public.bot_guild_settings(guild_id);
CREATE INDEX IF NOT EXISTS idx_bot_guild_settings_bot_product_id ON public.bot_guild_settings(bot_product_id);
CREATE INDEX IF NOT EXISTS idx_bot_installation_codes_guild_id ON public.bot_installation_codes(guild_id);
CREATE INDEX IF NOT EXISTS idx_bot_installation_codes_license_status ON public.bot_installation_codes(license_status);

-- Trigger to update updated_at
CREATE TRIGGER update_bot_products_updated_at
BEFORE UPDATE ON public.bot_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_guild_settings_updated_at
BEFORE UPDATE ON public.bot_guild_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
