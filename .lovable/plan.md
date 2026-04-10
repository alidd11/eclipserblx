

# Enterprise Audit - Correction Pass

## Findings Summary

| Priority | Issue | Status |
|----------|-------|--------|
| CRITICAL | `get_user_email(uuid)` callable by PUBLIC - email enumeration | Confirmed |
| LOW | `products.average_rating` missing column (external bot, every 60s) | External dependency |
| INFO | `store_domains` / `products` permission denied for anon | Working as designed |
| INFO | NaN bigint error | Not currently recurring |

## Fixes to Apply

### Fix 1: Revoke `get_user_email` public access (CRITICAL)

**Problem**: Any user (even anonymous) can call `public.get_user_email(any_uuid)` and resolve it to an email address. UUIDs are trivially obtainable from public-facing tables.

**Fix**: Database migration to revoke EXECUTE from PUBLIC, authenticated, and anon roles. The function is only called inside SECURITY DEFINER RLS policies, which execute under the owner's privileges and will continue working.

```sql
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM PUBLIC, authenticated, anon;
```

### Fix 2: Grant anon SELECT on `products` table (LOW)

**Problem**: External bot queries `products` table without authentication, causing "permission denied" errors every 60 seconds polluting DB logs.

**Fix**: Grant anon SELECT on `products` -- the table already has RLS enabled with appropriate policies restricting visibility to approved products only. This silences the log noise and lets the bot read public product data as intended.

```sql
GRANT SELECT ON public.products TO anon;
```

The `average_rating` column error will persist since that's a bot-side issue (querying a non-existent column), but at least the permission error will stop.

### No Code Changes Required

Both fixes are database-only migrations. No frontend or edge function code changes needed.

### What Will NOT Change
- No new features
- No architectural changes  
- No UI modifications

