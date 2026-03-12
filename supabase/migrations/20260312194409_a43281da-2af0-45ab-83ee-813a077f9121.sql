
-- 1. store_team_invites: "Users can view invites addressed to them" (SELECT)
DROP POLICY IF EXISTS "Users can view invites addressed to them" ON public.store_team_invites;
CREATE POLICY "Users can view invites addressed to them"
  ON public.store_team_invites
  FOR SELECT
  TO authenticated
  USING (email = public.get_user_email(auth.uid()));

-- 2. store_team_invites: "Invited users can delete their own invite" (DELETE)
DROP POLICY IF EXISTS "Invited users can delete their own invite" ON public.store_team_invites;
CREATE POLICY "Invited users can delete their own invite"
  ON public.store_team_invites
  FOR DELETE
  TO authenticated
  USING (email = public.get_user_email(auth.uid()));

-- 3. store_team_members: "Invited users can accept and join team" (INSERT)
DROP POLICY IF EXISTS "Invited users can accept and join team" ON public.store_team_members;
CREATE POLICY "Invited users can accept and join team"
  ON public.store_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.store_team_invites
      WHERE store_id = store_team_members.store_id
        AND email = public.get_user_email(auth.uid())
        AND expires_at > now()
    )
  );
