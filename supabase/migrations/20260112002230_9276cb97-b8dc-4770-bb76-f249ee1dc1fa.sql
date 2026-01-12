-- Remove the public SELECT policy that exposes IP ban data
DROP POLICY IF EXISTS "Anyone can check IP bans" ON public.ip_bans;

-- The admin-only policy already exists and is sufficient for managing bans
-- IP ban checks happen via the check-ip-ban Edge Function using service role