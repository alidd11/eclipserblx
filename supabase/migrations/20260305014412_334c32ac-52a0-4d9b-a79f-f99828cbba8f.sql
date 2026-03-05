
-- =====================================================
-- AUDIT TRIGGER: Log staff access to sensitive tables
-- =====================================================

-- Generic audit trigger for SELECT-sensitive tables
-- We create a function that staff-facing edge functions can call to log access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_user_id uuid,
  p_table_name text,
  p_action text DEFAULT 'view',
  p_record_count integer DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource, ip_address, details)
  VALUES (
    p_user_id,
    'sensitive_data_' || p_action,
    p_table_name,
    NULL,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
      'record_count', p_record_count,
      'accessed_at', now()
    )
  );
END;
$$;

-- =====================================================
-- PRIVACY: Add hide_from_leaderboard to profiles
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'hide_from_leaderboard'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN hide_from_leaderboard boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Update discord_xp public visibility policy to respect privacy preference
DROP POLICY IF EXISTS "Discord XP is publicly viewable" ON public.discord_xp;
CREATE POLICY "Discord XP is publicly viewable with privacy"
  ON public.discord_xp
  FOR SELECT
  TO public
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = discord_xp.user_id
        AND p.hide_from_leaderboard = true
    )
    OR discord_xp.user_id IS NULL
    OR (auth.uid() IS NOT NULL AND discord_xp.user_id = auth.uid())
  );

-- Update user_badges public visibility to respect privacy
DROP POLICY IF EXISTS "Anyone can view all user badges" ON public.user_badges;
CREATE POLICY "User badges viewable with privacy"
  ON public.user_badges
  FOR SELECT
  TO public
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_badges.user_id
        AND p.hide_from_leaderboard = true
    )
    OR (auth.uid() IS NOT NULL AND user_badges.user_id = auth.uid())
  );
