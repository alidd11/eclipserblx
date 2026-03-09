
-- =============================================================
-- FIX 1: user_roles - Restrict INSERT/DELETE to staff only
-- The current policies let any authenticated user assign roles
-- to OTHER users as long as hierarchy permits. This is a 
-- privilege escalation vector.
-- =============================================================

-- Drop the vulnerable policies
DROP POLICY IF EXISTS "Users can assign roles at or below their level" ON public.user_roles;
DROP POLICY IF EXISTS "Users can remove roles at or below their level" ON public.user_roles;

-- Re-create: only staff (via has_permission or is_staff) can assign/remove roles
-- Staff must still respect hierarchy
CREATE POLICY "Staff can assign roles at or below their level"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'manage_roles')
    AND public.can_assign_role(auth.uid(), role)
    AND public.can_manage_user_roles(auth.uid(), user_id)
  );

CREATE POLICY "Staff can remove roles at or below their level"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'manage_roles')
    AND public.can_assign_role(auth.uid(), role)
    AND public.can_manage_user_roles(auth.uid(), user_id)
  );

-- =============================================================
-- FIX 2: store_team_invites - Scope SELECT to own invites
-- =============================================================

DROP POLICY IF EXISTS "Authenticated users can view invite by token" ON public.store_team_invites;

-- Users can only see invites addressed to their own email
CREATE POLICY "Users can view invites addressed to them"
  ON public.store_team_invites FOR SELECT TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  );

-- =============================================================
-- FIX 3: ad_schedule_slots - Scope SELECT to own slots + staff
-- =============================================================

DROP POLICY IF EXISTS "Authenticated users can view slots" ON public.ad_schedule_slots;

-- Users see their own slots; staff see all
CREATE POLICY "Users can view own slots or staff can view all"
  ON public.ad_schedule_slots FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_permission(auth.uid(), 'manage_advertisements')
  );
