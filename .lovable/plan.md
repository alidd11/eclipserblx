

## Fix: Auth Race Condition Causing Access Denied on PWA Cold Open

### Root Cause

When the PWA opens from a cold start (or resumes from background), the stored JWT is often expired. Here's what happens:

1. `useAuth` sets the user from the stale cached session immediately
2. `useAdminAuth` fires the roles query with the expired token → gets a 403 `bad_jwt` error
3. The query catches the error and returns an empty array → `isStaff = false`
4. Supabase refreshes the token in the background, but it's too late — the roles query already failed
5. User sees "Access Denied" or gets redirected

This affects **all users** (customers and admins) because `useAdminAuth` and `useUserPermissions` both query with the stale token.

### Fix (2 files)

**1. `src/hooks/useAuth.tsx` — Remove the redundant `getSession()` call**

Supabase JS v2.47+ fires `INITIAL_SESSION` via `onAuthStateChange` automatically. The separate `getSession()` call is redundant and causes a race where stale session data is set before the token refresh completes.

- Remove the `getSession()` call entirely
- Rely solely on `onAuthStateChange` which handles `INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED`, and `SIGNED_OUT` events correctly
- Add a safety timeout (3 seconds) so loading doesn't hang forever if the listener never fires

**2. `src/hooks/useAdminAuth.tsx` — Add JWT-aware retry logic**

Even with the auth fix, network hiccups can cause transient 403s. Make the roles query resilient:

- Add `retry` function that retries on 403/JWT errors (up to 3 attempts with delay)
- Add `retryDelay` of 1 second to give the token refresh time to complete
- This ensures that even if the first query hits a stale token, the retry succeeds after refresh

### Why this fixes both customer and admin access

- Customer pages use `useAuth` → they get stuck in loading or see errors when the session is stale
- Admin pages use `useAdminAuth` → roles query fails → `isStaff = false` → "Access Denied"
- Both are fixed by ensuring the auth provider only emits a valid, fresh session

### No visual or functional changes

The fix is purely in the auth initialization timing. All existing routes, layouts, and permission checks remain identical.

