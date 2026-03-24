
-- ============================================================
-- Security Hardening Migration
-- ============================================================

-- 1. seller_agreements: Revoke anon access to sensitive columns
-- Keep the public policy for TOS check on store pages, but hide PII
REVOKE SELECT (ip_address, user_agent) ON public.seller_agreements FROM anon;

-- 2. store_domains: Revoke anon access to sensitive columns  
-- Keep public read for domain resolution, but hide internal fields
REVOKE SELECT (verification_token, cloudflare_hostname_id) ON public.store_domains FROM anon;

-- 3. Harden email queue functions with search_path
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
