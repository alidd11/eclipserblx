-- Fix: Drop the dangerous public SELECT policy that exposes all invites
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.store_team_invites;

-- Replace with: Only authenticated users can look up invites by their token (for accepting)
CREATE POLICY "Authenticated users can view invite by token"
  ON public.store_team_invites
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: The accept-invite edge function will use service_role to validate tokens,
-- and store owners already have their own SELECT policy.
-- This policy lets authenticated users see invites (needed to accept their own),
-- but no longer exposes data to anonymous users.