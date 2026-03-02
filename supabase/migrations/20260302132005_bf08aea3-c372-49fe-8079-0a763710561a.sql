
-- Fix: Allow invited users to accept invites by inserting themselves as team members
-- They must match the invite's email and the invite must be valid
CREATE POLICY "Invited users can accept and join team"
ON public.store_team_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.store_team_invites
    WHERE store_team_invites.store_id = store_team_members.store_id
      AND store_team_invites.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND store_team_invites.expires_at > now()
  )
);

-- Fix: Allow invited users to delete the invite after accepting
CREATE POLICY "Invited users can delete their own invite"
ON public.store_team_invites
FOR DELETE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
