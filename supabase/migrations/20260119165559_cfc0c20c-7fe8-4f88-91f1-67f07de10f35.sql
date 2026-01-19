-- Create discord_boost_trials table to track boost rewards and prevent abuse
CREATE TABLE public.discord_boost_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    discord_id TEXT NOT NULL,
    boost_count INTEGER NOT NULL DEFAULT 1 CHECK (boost_count >= 1 AND boost_count <= 2),
    trial_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_boost_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT discord_boost_trials_discord_id_key UNIQUE (discord_id)
);

-- Create index for faster lookups
CREATE INDEX idx_discord_boost_trials_user_id ON public.discord_boost_trials(user_id);
CREATE INDEX idx_discord_boost_trials_discord_id ON public.discord_boost_trials(discord_id);
CREATE INDEX idx_discord_boost_trials_trial_end ON public.discord_boost_trials(trial_end);

-- Enable RLS
ALTER TABLE public.discord_boost_trials ENABLE ROW LEVEL SECURITY;

-- Users can view their own boost trial records
CREATE POLICY "Users can view own boost trials"
ON public.discord_boost_trials
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Staff can view all boost trials
CREATE POLICY "Staff can view all boost trials"
ON public.discord_boost_trials
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can manage boost trials
CREATE POLICY "Staff can manage boost trials"
ON public.discord_boost_trials
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Add settings for boost rewards configuration
INSERT INTO public.settings (key, value)
VALUES ('boost_rewards_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value)
VALUES ('boost_trial_days', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;