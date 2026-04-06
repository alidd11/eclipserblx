
CREATE OR REPLACE FUNCTION public.mask_account(acct text)
RETURNS text LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN acct IS NULL THEN NULL
    WHEN length(acct) <= 4 THEN repeat('*', length(acct))
    ELSE repeat('*', length(acct) - 4) || right(acct, 4) END;
$$;

CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN email IS NULL THEN NULL
    WHEN position('@' in email) > 2 THEN left(email, 2) || repeat('*', position('@' in email) - 3) || substring(email from position('@' in email))
    ELSE repeat('*', position('@' in email) - 1) || substring(email from position('@' in email)) END;
$$;
