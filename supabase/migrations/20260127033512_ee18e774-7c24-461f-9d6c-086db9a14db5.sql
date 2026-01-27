-- Create table for storing multiple Discord role configurations
CREATE TABLE public.discord_role_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  role_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  description TEXT,
  auto_assign_on_purchase BOOLEAN NOT NULL DEFAULT true,
  min_order_amount NUMERIC(10,2),
  min_order_count INTEGER,
  requires_subscription BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT check_store_or_global CHECK (
    (store_id IS NOT NULL AND is_global = false) OR 
    (store_id IS NULL AND is_global = true)
  )
);

-- Enable RLS
ALTER TABLE public.discord_role_configs ENABLE ROW LEVEL SECURITY;

-- Policies for discord_role_configs
-- Admins can manage all configs
CREATE POLICY "Admins can manage all role configs"
ON public.discord_role_configs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Store owners can manage their own store's role configs
CREATE POLICY "Store owners can view their role configs"
ON public.discord_role_configs
FOR SELECT
TO authenticated
USING (
  store_id IS NOT NULL AND 
  public.is_store_owner(store_id, auth.uid())
);

CREATE POLICY "Store owners can insert their role configs"
ON public.discord_role_configs
FOR INSERT
TO authenticated
WITH CHECK (
  store_id IS NOT NULL AND 
  public.is_store_owner(store_id, auth.uid())
);

CREATE POLICY "Store owners can update their role configs"
ON public.discord_role_configs
FOR UPDATE
TO authenticated
USING (
  store_id IS NOT NULL AND 
  public.is_store_owner(store_id, auth.uid())
)
WITH CHECK (
  store_id IS NOT NULL AND 
  public.is_store_owner(store_id, auth.uid())
);

CREATE POLICY "Store owners can delete their role configs"
ON public.discord_role_configs
FOR DELETE
TO authenticated
USING (
  store_id IS NOT NULL AND 
  public.is_store_owner(store_id, auth.uid())
);

-- Create index for performance
CREATE INDEX idx_discord_role_configs_store_id ON public.discord_role_configs(store_id);
CREATE INDEX idx_discord_role_configs_global ON public.discord_role_configs(is_global) WHERE is_global = true;

-- Add updated_at trigger
CREATE TRIGGER update_discord_role_configs_updated_at
BEFORE UPDATE ON public.discord_role_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();