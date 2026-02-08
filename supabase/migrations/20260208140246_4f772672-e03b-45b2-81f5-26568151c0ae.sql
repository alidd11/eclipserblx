-- Create enum for ban types
CREATE TYPE public.global_ban_type AS ENUM ('permanent', 'temporary');

-- Create enum for sync status
CREATE TYPE public.global_ban_sync_status_type AS ENUM ('pending', 'success', 'failed', 'missing_permissions');

-- Table: global_bans - Active ban records
CREATE TABLE public.global_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    banned_discord_id TEXT NOT NULL,
    banned_username TEXT,
    banned_avatar_url TEXT,
    reason TEXT,
    ban_type public.global_ban_type NOT NULL DEFAULT 'permanent',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_via TEXT NOT NULL DEFAULT 'dashboard',
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: global_ban_logs - Audit trail
CREATE TABLE public.global_ban_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ban_id UUID NOT NULL REFERENCES public.global_bans(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    guild_id TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: global_ban_sync_status - Per-server sync tracking
CREATE TABLE public.global_ban_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ban_id UUID NOT NULL REFERENCES public.global_bans(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL,
    guild_name TEXT,
    status public.global_ban_sync_status_type NOT NULL DEFAULT 'pending',
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: global_guard_settings - User preferences
CREATE TABLE public.global_guard_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    auto_sync_new_servers BOOLEAN NOT NULL DEFAULT true,
    notify_on_sync_failure BOOLEAN NOT NULL DEFAULT true,
    default_ban_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_global_bans_owner ON public.global_bans(owner_user_id);
CREATE INDEX idx_global_bans_active ON public.global_bans(is_active) WHERE is_active = true;
CREATE INDEX idx_global_bans_discord_id ON public.global_bans(banned_discord_id);
CREATE INDEX idx_global_ban_logs_ban_id ON public.global_ban_logs(ban_id);
CREATE INDEX idx_global_ban_sync_status_ban_id ON public.global_ban_sync_status(ban_id);
CREATE INDEX idx_global_ban_sync_status_guild ON public.global_ban_sync_status(guild_id);

-- Enable RLS
ALTER TABLE public.global_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_ban_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_ban_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_guard_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for global_bans
CREATE POLICY "Users can view their own bans"
    ON public.global_bans FOR SELECT
    TO authenticated
    USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their own bans"
    ON public.global_bans FOR INSERT
    TO authenticated
    WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own bans"
    ON public.global_bans FOR UPDATE
    TO authenticated
    USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own bans"
    ON public.global_bans FOR DELETE
    TO authenticated
    USING (owner_user_id = auth.uid());

-- RLS Policies for global_ban_logs
CREATE POLICY "Users can view logs for their bans"
    ON public.global_ban_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.global_bans
            WHERE global_bans.id = global_ban_logs.ban_id
            AND global_bans.owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create logs for their bans"
    ON public.global_ban_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.global_bans
            WHERE global_bans.id = ban_id
            AND global_bans.owner_user_id = auth.uid()
        )
    );

-- RLS Policies for global_ban_sync_status
CREATE POLICY "Users can view sync status for their bans"
    ON public.global_ban_sync_status FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.global_bans
            WHERE global_bans.id = global_ban_sync_status.ban_id
            AND global_bans.owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create sync status for their bans"
    ON public.global_ban_sync_status FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.global_bans
            WHERE global_bans.id = ban_id
            AND global_bans.owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sync status for their bans"
    ON public.global_ban_sync_status FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.global_bans
            WHERE global_bans.id = global_ban_sync_status.ban_id
            AND global_bans.owner_user_id = auth.uid()
        )
    );

-- RLS Policies for global_guard_settings
CREATE POLICY "Users can view their own settings"
    ON public.global_guard_settings FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own settings"
    ON public.global_guard_settings FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
    ON public.global_guard_settings FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_global_bans_updated_at
    BEFORE UPDATE ON public.global_bans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_guard_settings_updated_at
    BEFORE UPDATE ON public.global_guard_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();