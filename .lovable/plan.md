

# Website-Wide Error & Security Audit — Fix Plan

I did a comprehensive scan of the entire platform covering database security, backend linting, and runtime errors. Here's what I found and how I'll fix each issue.

---

## Issues Found

### 1. Security: Seller agreement IP/user-agent data publicly readable
The `seller_agreements` table has a public RLS policy that exposes `ip_address` and `user_agent` columns to anonymous users. These are sensitive fields.

**Fix:** Create a database view (e.g., `public_seller_agreements`) exposing only safe columns (`store_id`, `agreement_version`, `signed_at`), then update the RLS policy to restrict the public SELECT, or replace client queries to use the view.

### 2. Security: Domain verification tokens publicly readable
The `store_domains` table's "Anyone can read active domains" policy exposes the `verification_token` column to anonymous users.

**Fix:** Drop the existing policy and replace it with one that uses a column-restricted approach — either via a secure view or by splitting into an authenticated-only policy for token access and a public policy via a view that excludes sensitive columns.

### 3. Backend: 3 functions missing `search_path` setting
The functions `enqueue_email`, `delete_email`, and `read_email_batch` are `SECURITY DEFINER` but don't set `search_path = public`, which is a security best practice to prevent search-path injection.

**Fix:** Run `ALTER FUNCTION` for each to add `SET search_path = public`.

### 4. False Positive (no action needed)
The scan flagged `is_staff()` potentially granting access to sellers/customers, but I verified the database — `seller`, `customer`, and `eclipse_plus_member` all have `is_status_role = true`, so they're correctly excluded.

---

## Implementation Steps

1. **Database migration** — Single SQL migration that:
   - Creates a `public_seller_agreements_view` with only safe columns and transfers the public policy to it
   - Drops the overly-broad policy on `seller_agreements`
   - Creates a `public_store_domains_view` excluding `verification_token` and `cloudflare_hostname_id`, with a public read policy
   - Drops the overly-broad policy on `store_domains`
   - Alters the 3 email functions to set `search_path = public`

2. **Update frontend queries** — Any client code querying `seller_agreements` or `store_domains` publicly will be updated to use the new views instead.

---

## Summary

| Issue | Severity | Fix |
|-------|----------|-----|
| Seller agreement PII exposed | High | Restrict via secure view |
| Domain verification tokens exposed | Medium | Restrict via secure view |
| 3 functions missing search_path | Low | ALTER FUNCTION |
| is_staff() role escalation | False positive | No action |

No runtime JavaScript errors, console errors, or network failures were detected.

