-- Grant SELECT on store_domains to authenticated (RLS policies already exist)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_domains TO authenticated;