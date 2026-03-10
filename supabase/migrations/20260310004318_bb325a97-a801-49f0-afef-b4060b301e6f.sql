
-- Fix feature_flags: restrict SELECT to staff only
DROP POLICY IF EXISTS "Authenticated can read feature flags" ON public.feature_flags;

CREATE POLICY "Staff can read feature flags"
  ON public.feature_flags
  FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'manage_settings')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lead_administrator')
  );

-- Allow users to check only flags that include their own user_id
CREATE POLICY "Users can check own feature flags"
  ON public.feature_flags
  FOR SELECT TO authenticated
  USING (auth.uid() = ANY(user_ids));
