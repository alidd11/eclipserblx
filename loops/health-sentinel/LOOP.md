# LOOP: Pre-launch Health Sentinel

## GOAL (one sentence)
Keep eclipserblx releasable every day: green types/build/tests, ESLint errors at
zero, and no new regressions in the diff since the last run.

## THE TASK (stepwise)
1. Read `MEMORY.md`. Note `LAST RUN SHA` and any `OPEN ITEMS`.
2. `git fetch origin main` and check out a fresh fix branch off `origin/main`:
   `loop/health-YYYYMMDD` (UTC date).
3. Run the health checks and record raw results:
   - `npx tsc --noEmit`
   - `npx vite build`
   - `npx vitest run`
   - `npx eslint .` (record the ERROR count only; warnings are allowed)
4. Diff `origin/main` against `LAST RUN SHA`. Scan ONLY that diff for the known
   regression classes (see below). Note every hit.
5. Fix ONLY the smallest, safest items — never a refactor, never a schema change,
   never anything touching auth/RLS/payments without escalating to a human.
   Nothing at all if the repo is already clean.
6. **Production error triage (if Sentry connector available):** query Sentry for
   NEW unresolved issues since the last run. For any that map to a clear, small code
   fix, fix it on the branch (subject to the same risk gate). Note anything too
   large/ambiguous as an OPEN ITEM instead of guessing.
7. Spawn the CHECKER subagent (see `CHECKER.md`) against the fix branch.
8. If FAIL: fix and re-run the checker. **Max 2 fix cycles**, then stop and report.
9. **Apply the AUTO-MERGE RISK GATE** (below): LOW-RISK + PASS → merge to `main`;
   HIGH-RISK → open a PR for approval.
10. **CI follow-through (if GitHub connector available):** for any PR opened (or the
    push to `main`), check CI. If CI fails, diagnose and push a fix (still within the
    risk gate + max 2 cycles). A green pipeline is the terminal state.
11. Write `runs/YYYY-MM-DD.md` (what ran, results, checker verdict, risk class, decision).
12. Update `MEMORY.md` (all sections + new LAST RUN SHA + RUN COUNT + 1).
    If no issues were found: commit the run log + memory, stop.

### Regression classes to scan for (from CLAUDE.md)
- Hardcoded hex/HSL colors instead of design tokens (`hsl(var(--x))`).
- A mutation that changes data shown elsewhere but doesn't invalidate the shared
  keys (`admin-overview-snapshot`, `mod-queue-*`).
- A new table without RLS, or a `SECURITY DEFINER` fn without `SET search_path`.
- A React hook placed after an early return (Rules of Hooks).
- A trigger calling `net.http_post` without the unset-GUC short-circuit + exception guard.
- New orphaned i18n keys, or copy added to fewer than all 5 locale files.

### Bot uptime-critical checks (eclipse-portal-bot/)
This env cannot reach the deployed bot (proxy blocks fly.dev), so the loop guards
the bot's uptime posture in CODE. If a diff touches `eclipse-portal-bot/`, verify:
- `node --check` passes on every changed `.js` file.
- `index.js` uses the `Partials` enum in `partials:` (never the strings
  'CHANNEL'/'MESSAGE') — string partials silently break DM/modmail.
- `/health` returns a non-200 status when `client.isReady()` is false (truthful
  health is what lets Fly + uptime monitors detect a down bot).
- `client.login(...)` has a `.catch()` that exits, and the readiness watchdog
  (`MAX_NOT_READY_MS`) is still present — both are the self-restart safety net.
- `fly.toml` still has `min_machines_running >= 1` and an http health check on `/health`.
- Every command routed in `src/handlers/interaction.js` (switch cases +
  DEFERRED_COMMANDS) has a matching entry in `src/register-commands.js` — an
  unregistered handler is a dead command.

## THE CHECK (pass/fail)
PASS requires ALL of:
- `tsc --noEmit` clean, `vite build` succeeds, `vitest run` all pass.
- ESLint error count is 0 (not increased vs last run).
- Any fix diff is < 100 lines.
- The CHECKER subagent returns PASS.
Anything else is FAIL.

## AUTO-MERGE RISK GATE (checker-gated autonomy)
After the checker returns PASS, classify the change:
- **LOW-RISK** — ALL of: fix diff < 100 lines; touches ONLY `src/**` app code,
  styles, or `eclipse-portal-bot/**`; does NOT touch any of: `supabase/functions/**`,
  `supabase/migrations/**`, anything matching `auth`/`rls`/`policy`/`payment`/
  `stripe`/`webhook`/`security`, `package.json`/lockfiles, CI/config, or env handling.
- **HIGH-RISK** — anything else (auth, RLS, payments, migrations, edge functions,
  deps, config, or diff ≥ 100 lines).

Action by class:
- **LOW-RISK + checker PASS** → the loop MAY fast-forward/merge its `loop/health-YYYYMMDD`
  branch into `main` itself (git push origin main), then log it. This is the
  autonomous path.
- **HIGH-RISK** (or checker FAIL, or any doubt) → push the branch and open a PR for a
  human to approve. NEVER auto-merge high-risk.

## STOP CONDITIONS (whichever comes first)
- LOW-RISK fix, checker PASS → auto-merged to `main`; log it and stop, OR
- HIGH-RISK fix, checker PASS → PR opened for approval; stop, OR
- No issues found — log "clean" and stop, OR
- 2 fix cycles used without a PASS — stop and report in the run log.
HARD CAPS (enforced outside this file, in the Routine):
- **One run per night.**
- **Auto-merge is for LOW-RISK changes only.** Payments, auth, RLS, migrations, and
  edge functions ALWAYS require a human PR approval — never auto-merged.

## RUN RULE
Every run STARTS by reading `MEMORY.md` and ENDS by updating it. No exceptions.
