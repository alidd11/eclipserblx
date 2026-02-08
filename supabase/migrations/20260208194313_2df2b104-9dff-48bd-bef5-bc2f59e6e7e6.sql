-- Create table for Global Guard guild role permissions
CREATE TABLE public.global_guard_guild_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  guild_id TEXT NOT NULL,
  guild_name TEXT,
  discord_role_id TEXT NOT NULL,
  discord_role_name TEXT,
  permission_level TEXT NOT NULL DEFAULT 'manager' CHECK (permission_level IN ('viewer', 'manager', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, guild_id, discord_role_id)
);

-- Enable RLS
ALTER TABLE public.global_guard_guild_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own guild permissions
CREATE POLICY "Users can view their own guild permissions"
ON public.global_guard_guild_permissions
FOR SELECT
USING (owner_user_id = auth.uid());

-- Policy: Users can insert their own guild permissions
CREATE POLICY "Users can create their own guild permissions"
ON public.global_guard_guild_permissions
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Policy: Users can update their own guild permissions
CREATE POLICY "Users can update their own guild permissions"
ON public.global_guard_guild_permissions
FOR UPDATE
USING (owner_user_id = auth.uid());

-- Policy: Users can delete their own guild permissions
CREATE POLICY "Users can delete their own guild permissions"
ON public.global_guard_guild_permissions
FOR DELETE
USING (owner_user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_global_guard_guild_permissions_updated_at
BEFORE UPDATE ON public.global_guard_guild_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_gg_guild_permissions_owner ON public.global_guard_guild_permissions(owner_user_id);
CREATE INDEX idx_gg_guild_permissions_guild ON public.global_guard_guild_permissions(guild_id);