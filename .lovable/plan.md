
Issue restated:
- Users are seeing a black screen on Safari and installed PWAs (customer + admin).

Do I know what the issue is? Yes.

What’s most likely happening from code + logs:
1) Global black screen path exists in `EmailGuard`
- `src/components/auth/EmailGuard.tsx` returns `null` while auth is loading.
- This creates an empty page (only background), which users perceive as a black screen.

2) First-open auth still hits invalid JWTs
- Recent logs still show `/auth/v1/user` `403 bad_jwt` / `missing sub claim`.
- During cold-open recovery, `useAuth` can spend several seconds in refresh/validation before resolving.
- Combined with (1), users see a black screen instead of a visible loading/recovery state.

3) PWA startup redirect is duplicated
- `usePWAAdminRedirect()` is called globally (`AdminPWAHandler`) and again in `Index.tsx`.
- This can create extra startup churn on standalone launches.

Implementation plan:
1) Replace black screen behavior with explicit bootstrap UI
- Update `src/components/auth/EmailGuard.tsx`:
  - Never return `null` while loading.
  - Render a full-screen branded loader + “Reconnecting…” message.
  - Add bounded timeout state (e.g. 8–10s) that switches to actionable recovery UI (Retry / Go to Sign In).

2) Add hard auth bootstrap deadline
- Update `src/hooks/useAuth.tsx`:
  - Add absolute max bootstrap timer (independent of refresh/getSession retries).
  - If deadline is reached, resolve auth as unauthenticated and stop loading.
  - Keep existing token validation/refresh logic, but guarantee loading cannot hang.

3) Reduce PWA startup race noise
- Remove duplicate admin redirect invocation (keep one source of truth):
  - Prefer keeping `AdminPWAHandler` global hook.
  - Remove `usePWAAdminRedirect()` call from `src/pages/Index.tsx`.

4) Improve user-facing recovery for expired sessions
- In `EmailGuard` and admin gate flows, show explicit “Session expired” state when JWT recovery fails, rather than blank/indeterminate states.

5) Add temporary startup diagnostics
- Add concise one-line boot logs in `useAuth` and `EmailGuard`:
  - auth event source
  - bootstrap deadline hit/not hit
  - final gate outcome (allow / redirect / expired)
- Keep for short verification window, then remove.

Files to update:
- `src/components/auth/EmailGuard.tsx`
- `src/hooks/useAuth.tsx`
- `src/pages/Index.tsx`
- (optional for consistency) `src/components/admin/AdminLayout.tsx`

Validation plan (must be on published + installed PWAs):
1) Cold open customer PWA 5 times (Safari + desktop browser).
2) Cold open admin PWA 5 times.
3) Confirm:
- no black screen at startup,
- loader/recovery UI appears instead of blank page,
- no infinite wait,
- valid users can enter routes on first attempt.
4) Confirm auth logs: no prolonged bursts of `bad_jwt` without recovery.
