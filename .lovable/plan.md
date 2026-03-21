
Issue re-stated:
- Failures still occur on first open (Safari + desktop), including stuck loading and crash/Access issues.

Do I know what the issue is? Yes.

What the latest audit shows:
1) Cloud/edge security is not the active blocker right now  
- No recent optimize/fix function executions; current failures are happening in app auth bootstrap paths.
2) Auth bootstrap still has a first-open race  
- `useAuth` only rejects tokens missing `sub`, but it still accepts expired/near-expiry tokens from `onAuthStateChange` and resolves app state too early.
- That lets role/permission queries run on stale tokens first, causing `bad_jwt` / `missing sub claim` bursts.
3) Admin gate can get stuck in “recovering” forever  
- `useAdminAuth` sets `isAuthRecovering` from error state and keeps loading true, which can lock the page on spinner.
4) Account page can show wrong state during bootstrap  
- `Account.tsx` checks `!user` before honoring auth initialization loading, causing false “Please sign in” flashes / bad UX on cold starts.

Implementation plan (support-style hardening, no schema changes):
1) Harden auth initialization in `src/hooks/useAuth.tsx`
- Add a strict session acceptance gate: token must have valid `sub` AND be fresh (`expires_at > now + buffer`).
- On `INITIAL_SESSION` with stale token: refresh before resolving user/session.
- Add single-flight refresh guard to prevent concurrent refresh storms.
- If refresh fails or returns invalid token: clear local auth storage via local sign-out and resolve unauthenticated (never hang).

2) Remove infinite recovery state in `src/hooks/useAdminAuth.tsx`
- Replace permanent `isAuthRecovering` loading with bounded recovery window.
- After retry exhaustion on JWT errors, return a terminal auth error state (not infinite spinner).
- Expose `authErrorCode` so UI can show “session expired, retry/sign in” instead of endless loading.

3) Apply same bounded recovery in `src/hooks/useUserPermissions.tsx`
- Keep one internal refresh+retry path.
- If JWT error persists, fail fast with typed auth error, not silent endless retries.

4) Fix account bootstrap gate in `src/pages/Account.tsx`
- Add early guard: while `authLoading` (and key profile bootstrap state), render loading skeleton.
- Only render “Please Sign In” after auth initialization is definitively complete.

5) Update admin gate UI in `src/components/admin/AdminLayout.tsx`
- Distinguish:
  - loading (temporary)
  - session-expired/auth-error (actionable prompt)
  - true access denied (final authorization result)
- Prevent spinner lock on terminal auth faults.

6) Add targeted diagnostics (temporary) in the same files
- One structured startup trace per boot:
  - session source/event
  - token fresh/invalid
  - refresh attempted/success/fail
  - gate outcome (loading/expired/denied/allowed)
- Keep logs concise for 24–48h and then remove.

Why this should solve the “every first open” pattern:
- Expired tokens will no longer be accepted as ready auth state.
- Role/permission queries won’t run until a fresh session is confirmed.
- Recovery failures become explicit and recoverable (retry/sign in) instead of infinite loading.

Validation plan (published + installed PWA + desktop):
1) Cold open x5 on Safari installed PWA (customer + admin routes).
2) Cold open x5 on desktop browser (same routes).
3) Resume from background x5 (both roles).
4) Confirm:
- no infinite spinner,
- no false access denied for valid staff,
- no first-open signed-out flicker on account,
- no crash/reload loop from auth startup.
5) Check runtime logs to ensure stale-token boots now go through refresh-before-resolve path.

Scope:
- Files to update:  
  `src/hooks/useAuth.tsx`  
  `src/hooks/useAdminAuth.tsx`  
  `src/hooks/useUserPermissions.tsx`  
  `src/pages/Account.tsx`  
  `src/components/admin/AdminLayout.tsx`
- No database migration required.
