
DROP POLICY IF EXISTS "Admins full access to guild_command_permissions" ON public.guild_command_permissions;
CREATE POLICY "Admins full access to guild_command_permissions"
ON public.guild_command_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can record consent" ON public.consent_records;
CREATE POLICY "Anyone can record consent"
ON public.consent_records
FOR INSERT
TO anon, authenticated
WITH CHECK (
  visitor_id IS NOT NULL
  AND length(visitor_id) > 0
  AND length(visitor_id) < 200
  AND action IS NOT NULL
  AND length(action) BETWEEN 1 AND 50
  AND consent_version IS NOT NULL
  AND length(consent_version) BETWEEN 1 AND 20
  AND public.check_rate_limit(visitor_id, 'consent_record', 10, 60)
);
