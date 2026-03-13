
Goal: stop the `/admin/revenue` Safari crash loop where submitting password verification causes 2 refreshes and then “Problem repeatedly occurred”.

What I found
- The failure starts exactly at verify submit on `/admin/revenue`.
- Runtime error confirms: `TypeError: Importing a module script failed.`
- In `src/pages/admin/RevenueHub.tsx`, password verification currently does a runtime dynamic import of `@supabase/supabase-js` inside `handleVerifyPassword`.
- In `src/lib/chunkErrorHandler.ts`, any “module script” error triggers auto-reload, which can create refresh loops on iOS Safari.

Implementation plan

1) Remove runtime dynamic import from Revenue verification path
- File: `src/pages/admin/RevenueHub.tsx`
- Replace `await import('@supabase/supabase-js')` inside submit handler with a static top-level import of `createClient`.
- Create a dedicated verification client once (outside render or memoized) with:
  - `persistSession: false`
  - `autoRefreshToken: false`
- Keep verification isolated from main auth client (so no auth-state loop), but avoid late chunk loading during submit.

2) Add submit-loop safety in Revenue verification
- File: `src/pages/admin/RevenueHub.tsx`
- Add early-return guard if already verifying (prevents double-submit race from tap + keyboard submit).
- After successful verify, immediately clear password field and (optionally) sign out verification client to keep it ephemeral.
- Keep existing `sessionStorage` verification timestamp logic.

3) Harden chunk error auto-reload behavior to prevent Safari “repeatedly occurred”
- File: `src/lib/chunkErrorHandler.ts`
- Replace raw `sessionStorage` calls with safe wrappers (`safeSessionStorage` / safe fallback) so storage edge cases don’t break guardrails.
- Do not clear reload marker immediately at module eval; instead clear only after a stable load phase (e.g., `window.load` + short delay).
- Keep cooldown logic and enforce single reload-attempt behavior within cooldown window.
- Result: one recovery reload max, no cascading reload loop.

4) Align legacy Income gate (defensive consistency)
- File: `src/pages/admin/Income.tsx`
- Apply same isolated verification-client pattern as Revenue (or fully convert this page to a redirect shell if still retained only for legacy).
- This prevents old cached routes from triggering session-reset behavior if users land on legacy finance code.

Validation checklist (after implementation)
1. Open published site on iOS Safari → go to `/admin/revenue`.
2. Enter password and submit.
3. Expected:
   - No hard page refresh loop.
   - No “Problem repeatedly occurred”.
   - Revenue dashboard loads and remains stable.
4. Confirm console no longer shows `Importing a module script failed` tied to password submit.
5. Verify timeout re-lock still works and re-verification still succeeds.
