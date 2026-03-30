
-- Re-add a restricted public SELECT policy for store_domains that only allows reading non-sensitive columns
-- We use a policy that restricts to active domains, and rely on CLS to hide sensitive columns
-- First ensure CLS is in place for sensitive columns
REVOKE SELECT ON store_domains FROM anon;
GRANT SELECT (id, store_id, domain, domain_type, status, is_primary, created_at) ON store_domains TO anon;
GRANT SELECT (id, store_id, domain, domain_type, status, is_primary, created_at) ON store_domains TO authenticated;

-- Re-add a public SELECT policy for active domains only (anon can now only see granted columns)
CREATE POLICY "Anyone can read active domains safely"
  ON store_domains FOR SELECT
  TO anon
  USING (status = 'active');
