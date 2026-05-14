## Goal

Eliminate the white-screen that staff hit when they sign in and land on `/admin`, and add observability so any future regression is **visible (a fallback UI + Sentry breadcrumb)** instead of a blank page.

## Findings from investigation

I audited the full admin entry path: `/admin` → `<AdminDashboard>` → `<AdminLayout>` → `useAdminAuth` → `useAuth` (`AuthProvider`) → child widgets (`HeroBanner`, `DashboardKPIs`, `SystemAlerts`, `DutyClockWidget`, `QuickActionsGrid`, `AssignedTicketsWidget`) and the supporting hooks (`useStaffPresence`, `useUserPermissions`, `useAdminManifest`, `useSupportTicketNotifications`, `useSellerTicketNotifications`).

The auth-server logs show **repeated `403: invalid claim: missing sub claim` / `bad_jwt` on `GET /user`** from `roleplay-hub-shop.lovable.app`. That is the classic stale-cached-session shape that primarily hits **installed PWA** users (where the access token is persisted across deploys / project refs).

Three concrete failure modes can produce a white screen on `/admin` after sign-in. Each is fixable independently and they are not mutually exclusive — staff have probably been hitting more than one.

### 1. No admin-scoped error boundary around dashboard children

`AdminLayout` renders `<PageTransition>{children}</PageTransition>` with no inner `ErrorBoundary`. The only safety net is the top-level `RouteErrorBoundary` in `AppRoutes`. If a render error escapes a widget after `AdminLayout` has already committed, the route-level boundary unmounts the entire admin shell. In the "chunk error during retry" path this can momentarily render nothing while `lazyWithRetry` re-resolves — visually a blank page.

### 2. `useStaffPresence` re-subscribes on every render

The presence `useEffect` depends on `getCurrentUserName`, a `useCallback` whose dependency `currentUserProfile` changes whenever the profile query refetches. Each change tears down and re-subscribes the realtime channel and triggers a `profiles.update({ last_seen })` write. On a slow network this can stall the first paint and, combined with React 18 StrictMode double-invoke, occasionally throws inside the cleanup path.

### 3. Bounded but unhelpful auth-recovery state

`useAdminAuth.isGateLoading` keeps the spinner up while `isAuthRecovering` is true. With `bad_jwt` errors, `react-query` retries 3× at 1.5s each → up to ~7 s of spinner. If the user's `refresh_token` is also stale (which is what the 403s in auth-logs imply), the spinner eventually flips to the `Session Expired` screen — but only if the JWT-error detector fires. The current detector matches on `message`/`code`, but `supabase-js` returns the error nested under `details` for some PostgREST 401 paths, so the JWT branch doesn't always trigger and the spinner can hang past the deadline. From the user's perspective: spinner that fades into white when React 18 commits the empty branch.

## Plan

### A. Make any future white-screen self-evident

1. Wrap `<PageTransition>{children}</PageTransition>` inside `AdminLayout` with a new `<AdminErrorBoundary>` (lightweight class component, same shape as `RouteErrorBoundary`, branded "This admin page hit an error"). It must:
   - log to `captureException` with route + user id breadcrumbs,
   - offer **Retry**, **Reload**, **Sign out** actions,
   - reset itself when the route key changes.
2. Render a small "Loading admin dashboard…" caption under the existing `Loader2` so a stalled bootstrap is no longer indistinguishable from a blank page.

### B. Fix the auth-recovery hang

3. Tighten `isJwtError` in `useAdminAuth` and `useUserPermissions`: also check `error.status === 401/403`, `error.details`, and `error.hint`, and treat PostgREST `PGRST302` the same as `PGRST301`.
4. Add a hard ceiling: if `loading` is still true 6 s after `useAdminAuth` mounts with a non-null `user.id`, force `isAuthExpired = true` so the `Session Expired` screen renders instead of an indefinite spinner.
5. In `AuthProvider.validateAndAccept`, when the token is missing `sub` and refresh fails, surface a one-time toast **before** the local sign-out so staff know why they were bounced.

### C. Stabilise the dashboard widgets

6. `useStaffPresence`: drop `getCurrentUserName` from the effect deps; resolve the display name lazily inside the `track()` call. Move the `last_seen` update into a `useInterval` outside the channel effect so the realtime channel is not torn down each minute.
7. `HeroBanner` and `useStaffPresence` profile queries: switch `.single()` to `.maybeSingle()` so brand-new Google-signed-in staff (no `profiles` row yet) cannot throw PGRST116. Provide a sensible fallback ("Welcome").
8. `DashboardKPIs`, `SystemAlerts`, `AssignedTicketsWidget`: wrap each `Promise.all` in a try/catch that returns the partial data already collected. One failed sub-query should degrade a card, never blank the page.

### D. PWA cache hygiene

9. Add a one-shot "kill stale admin session" check on `/admin` mount: if `localStorage` contains a Supabase session whose access token JWT lacks `sub`, purge it and redirect to `/admin/login` with `?reason=session-expired`. This is the cause of the `bad_jwt` storms in auth-logs and only ever resolves itself today by the user manually clearing site data.

### E. Verification

10. Reproduce via the browser tool against the **published** site: sign in as a staff account, navigate to `/admin`, confirm dashboard renders.
11. Simulate the bad-JWT case by injecting a tampered token into `localStorage` and reloading; confirm the new auto-purge → `/admin/login?reason=session-expired` flow works (no white screen, no stuck spinner).
12. Confirm the new `AdminErrorBoundary` renders by temporarily throwing inside `HeroBanner` in a scratch branch; revert.

## Out of scope

- No new admin features, no design changes (per project memory: FIX + OPTIMISATION only).
- No changes to `src/integrations/supabase/client.ts`, `types.ts`, or `.env`.
- No PWA manifest reshaping — only the auth-token purge described in step 9.

## Expected outcome

Staff who sign in and open `/admin` either see the dashboard or, in the worst case, see an actionable error/expired-session screen with **Retry** and **Sign In** buttons — never a blank white screen.
