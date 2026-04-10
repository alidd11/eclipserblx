
-- Restore minimal public read for approved stores (needed for joins in products_storefront, products_public views)
CREATE POLICY "Public can view approved active stores"
ON public.stores
FOR SELECT
USING (status = 'approved' AND is_active = true);

-- Also add team member access to stores
CREATE POLICY "Team members can view their store"
ON public.stores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_team_members stm
    WHERE stm.store_id = stores.id
    AND stm.user_id = auth.uid()
    AND stm.accepted_at IS NOT NULL
  )
);
