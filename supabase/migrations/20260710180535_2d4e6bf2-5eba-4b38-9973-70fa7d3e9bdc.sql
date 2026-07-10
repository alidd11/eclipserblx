
DROP POLICY IF EXISTS "Authenticated staff can insert tickets" ON public.discord_modmail_tickets;
CREATE POLICY "Authenticated staff can insert tickets"
ON public.discord_modmail_tickets
FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Team members can manage pages" ON public.store_pages;
CREATE POLICY "Team managers can manage pages"
ON public.store_pages
FOR ALL TO authenticated
USING (public.is_store_team_member(store_id, auth.uid(), ARRAY['manager']::store_team_role[]))
WITH CHECK (public.is_store_team_member(store_id, auth.uid(), ARRAY['manager']::store_team_role[]));

DROP POLICY IF EXISTS "Team members can manage nav links" ON public.store_nav_links;
CREATE POLICY "Team managers can manage nav links"
ON public.store_nav_links
FOR ALL TO authenticated
USING (public.is_store_team_member(store_id, auth.uid(), ARRAY['manager']::store_team_role[]))
WITH CHECK (public.is_store_team_member(store_id, auth.uid(), ARRAY['manager']::store_team_role[]));
