
Issue re-stated from your answers:
- It still fails on the published installed PWA.
- It affects both customer and admin routes.
- It happens on every first open.
- Symptoms are crash/error page or stuck loading.

Do I know what the issue is? Yes — there are still two startup failure paths not fully covered.

What’s still wrong (from code + logs):
1) Auth bootstrap can still hang or resolve with a bad token on first-open PWA paths  
- `useAuth` fallback recovery relies on `getSession()/refreshSession()` without a hard timeout; if those stall, loading can remain true (stuck screen).
- Earlier logs show `invalid claim: missing sub claim`/`bad_jwt`, which means malformed/stale JWT can still be consumed during startup.

2) Chunk recovery is still too broad for Safari-style “Load failed” messages  
- `chunkRecovery.ts` treats plain `"load failed"` as chunk-like in `isChunkError`, which can misclassify non-chunk network failures.
- Your network log shows external request failures with “Load failed” (Discord API), which should never trigger chunk hard-reload behavior.

Files to fix:
- `src/hooks/useAuth.tsx`
- `src/hooks/useAdminAuth.tsx`
- `src/hooks/useUserPermissions.tsx`
- `src/lib/chunkRecovery.ts`
- `src/components/ConnectionErrorBoundary.tsx`
- `src/components/RouteErrorBoundary.tsx`
- `src/components/admin/AdminLayout.tsx`

Implementation plan:
1) Harden auth bootstrap with explicit timeout + token sanity gate (`useAuth`)
- Add bounded promise wrappers for `getSession`, `refreshSession`, and optional `getUser` verification.
- Validate access token payload has `sub` before trusting recovered session.
- If token is malformed: attempt one refresh; if still invalid, clear local auth state cleanly and resolve unauthenticated (never infinite loading).
- Keep existing listener-first strategy, but ensure safety path cannot hang.

2) Make role/permission hooks self-healing, not deny-by-default on transient JWT faults
- In `useAdminAuth` and `useUserPermissions`, on JWT/403 errors:
  - run one immediate `refreshSession()` attempt inside query flow,
  - retry the same query once after refresh before surfacing error.
- Return an explicit “authRecovering” state so UI does not interpret transient failure as no roles/no permissions.

3) Stop false chunk recovery triggers
- Tighten `isChunkError` so Safari handling requires module/chunk context (e.g. module script/import/chunk asset), not plain `"load failed"` alone.
- Keep strict asset URL checks for global listeners; mirror same strictness in boundaries.

4) Prevent false “Access Denied” during recovery windows
- In `AdminLayout`, if roles query is in auth-recovery/error-jwt state, show loading/retry UI instead of immediate access denied.
- Only render “Access Denied” after role resolution is definitive.

5) Add targeted diagnostics for final verification
- Log one structured startup trace per boot: auth source path taken, token-valid/invalid, refresh attempted/succeeded, and whether recovery reload was chunk-qualified.
- Keep logs concise and removable after stability confirmation.

Technical details (non-UI behavior changes):
- No database schema or policy changes.
- No auth model changes.
- No feature/UI redesign — this is startup reliability hardening.
- Focus is deterministic boot order + strict error classification.

Validation plan (published PWA, not just preview):
- Customer and admin apps, first open x5 each.
- Cold open after force-close, and resume from background x5 each.
- Confirm:
  - no infinite loading,
  - no false crash/reload from non-chunk “Load failed” requests,
  - no false access denied for valid staff users,
  - successful route entry on first attempt.
