

# Fix: "permission denied for table users" on Store Team Members

## Root Cause

Three RLS policies on `store_team_invites` and `store_team_members` contain inline subqueries against `auth.users` to get the current user's email:

```sql
SELECT users.email FROM auth.users WHERE users.id = auth.uid()
```

The `authenticated` role does not have SELECT permission on `auth.users`. This causes every operation that evaluates these policies to fail with "permission denied for table users".

## Fix

Replace the `auth.users` subqueries with the existing `get_user_email(auth.uid())` SECURITY DEFINER function, which safely reads from `auth.users` on the caller's behalf.

**Three policies to recreate:**

1. `store_team_invites` — "Users can view invites addressed to them" (SELECT)
   - `qual`: `email = get_user_email(auth.uid())`

2. `store_team_invites` — "Invited users can delete their own invite" (DELETE)
   - `qual`: `email = get_user_email(auth.uid())`

3. `store_team_members` — "Invited users can accept and join team" (INSERT)
   - `with_check`: `auth.uid() = user_id AND EXISTS (SELECT 1 FROM store_team_invites WHERE store_id = store_team_members.store_id AND email = get_user_email(auth.uid()) AND expires_at > now())`

**No code changes needed** — only database migration to drop and recreate these three policies.

