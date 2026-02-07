-- Create discord XP/leveling table for gamification
CREATE TABLE public.discord_xp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  messages_count INTEGER NOT NULL DEFAULT 0,
  commands_used INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_message_xp_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily claims table for /daily command
CREATE TABLE public.discord_daily_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL,
  claimed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  streak_day INTEGER NOT NULL DEFAULT 1,
  bonus_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(discord_id, claimed_at)
);

-- Create index for efficient lookups
CREATE INDEX idx_discord_xp_discord_id ON public.discord_xp(discord_id);
CREATE INDEX idx_discord_xp_total_xp ON public.discord_xp(total_xp DESC);
CREATE INDEX idx_discord_xp_level ON public.discord_xp(level DESC);
CREATE INDEX idx_discord_daily_claims_lookup ON public.discord_daily_claims(discord_id, claimed_at DESC);

-- Enable RLS
ALTER TABLE public.discord_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_daily_claims ENABLE ROW LEVEL SECURITY;

-- Public SELECT for leaderboards
CREATE POLICY "Discord XP is publicly viewable"
ON public.discord_xp FOR SELECT
USING (true);

-- Service role manages XP (edge functions)
CREATE POLICY "Service role can manage discord_xp"
ON public.discord_xp FOR ALL
USING (true)
WITH CHECK (true);

-- Daily claims viewable by linked user
CREATE POLICY "Users can view their own daily claims"
ON public.discord_daily_claims FOR SELECT
USING (
  discord_id IN (
    SELECT discord_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Service role manages daily claims
CREATE POLICY "Service role can manage daily_claims"
ON public.discord_daily_claims FOR ALL
USING (true)
WITH CHECK (true);

-- Function to calculate level from XP (logarithmic scaling)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Level formula: each level requires progressively more XP
  -- Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, etc.
  IF xp < 100 THEN RETURN 1; END IF;
  RETURN FLOOR(1 + SQRT(xp / 50.0))::INTEGER;
END;
$$;

-- Function to add XP and update level
CREATE OR REPLACE FUNCTION public.add_discord_xp(
  p_discord_id TEXT,
  p_discord_username TEXT,
  p_xp_amount INTEGER,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, leveled_up BOOLEAN, old_level INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Upsert XP record
  INSERT INTO public.discord_xp (discord_id, discord_username, user_id, total_xp, level)
  VALUES (p_discord_id, p_discord_username, p_user_id, p_xp_amount, calculate_level_from_xp(p_xp_amount))
  ON CONFLICT (discord_id) DO UPDATE SET
    discord_username = COALESCE(EXCLUDED.discord_username, discord_xp.discord_username),
    user_id = COALESCE(EXCLUDED.user_id, discord_xp.user_id),
    total_xp = discord_xp.total_xp + p_xp_amount,
    level = calculate_level_from_xp(discord_xp.total_xp + p_xp_amount),
    commands_used = discord_xp.commands_used + 1,
    updated_at = now()
  RETURNING 
    discord_xp.total_xp,
    discord_xp.level,
    (SELECT level FROM public.discord_xp WHERE discord_id = p_discord_id)
  INTO v_new_xp, v_new_level, v_old_level;

  -- If this was an insert, old level is 0
  IF v_old_level IS NULL THEN
    v_old_level := 0;
  END IF;

  RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_old_level), v_old_level;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_discord_xp_updated_at
BEFORE UPDATE ON public.discord_xp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_xp;