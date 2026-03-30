
-- Fix 1: bot_error_logs - restrict INSERT to service_role only
DROP POLICY "Service role can insert bot error logs" ON bot_error_logs;
CREATE POLICY "Service role can insert bot error logs"
  ON bot_error_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Fix 2: seller_agreements - remove public SELECT policy that exposes user_agent and signer UUIDs
DROP POLICY "Public can check agreement existence" ON seller_agreements;

-- Fix 3: store_domains - replace open public SELECT with restricted version
DROP POLICY "Anyone can read active domains" ON store_domains;

-- Create a security invoker view for public domain lookups (only non-sensitive columns)
CREATE OR REPLACE VIEW public.store_domains_public
WITH (security_invoker = on)
AS SELECT domain, domain_type, store_id, status
FROM store_domains
WHERE status = 'active';

-- Allow anon to read the safe view
GRANT SELECT ON public.store_domains_public TO anon;
GRANT SELECT ON public.store_domains_public TO authenticated;

-- Fix 4: download_logs - replace hardcoded email with role-based check
DROP POLICY "Only owner can delete download logs" ON download_logs;
CREATE POLICY "Only admin can delete download logs"
  ON download_logs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
