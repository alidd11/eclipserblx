
GRANT SELECT ON public.store_payment_details_safe TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_team_invites TO authenticated;
GRANT ALL ON public.store_team_invites TO service_role;
