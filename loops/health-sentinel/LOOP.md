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
6. Spawn the CHECKER subagent (see `CHECKER.md`) against the fix branch.
7. If FAIL: fix and re-run the checker. **Max 2 fix cycles**, then stop and report.
8. Write `runs/YYYY-MM-DD.md` (what ran, results, checker verdict, decision).
9. Update `MEMORY.md` (all sections + new LAST RUN SHA + RUN COUNT + 1).
10. If fixes were made and the check passed: **open a PR to `main`** and stop.
    If no fixes were needed: commit the run log + memory, stop. Do not open a PR.

### Regression classes to scan for (from CLAUDE.md)
- Hardcoded hex/HSL colors instead of design tokens (`hsl(var(--x))`).
- A mutation that changes data shown elsewhere but doesn't invalidate the shared
  keys (`admin-overview-snapshot`, `mod-queue-*`).
- A new table without RLS, or a `SECURITY DEFINER` fn without `SET search_path`.
- A React hook placed after an early return (Rules of Hooks).
- A trigger calling `net.http_post` without the unset-GUC short-circuit + exception guard.
- New orphaned i18n keys, or copy added to fewer than all 5 locale files.

## THE CHECK (pass/fail)
PASS requires ALL of:
- `tsc --noEmit` clean, `vite build` succeeds, `vitest run` all pass.
- ESLint error count is 0 (not increased vs last run).
- Any fix diff is < 100 lines.
- The CHECKER subagent returns PASS.
Anything else is FAIL.

## STOP CONDITIONS (whichever comes first)
- Check passes and a PR is opened (fixes made), OR
- No issues found — log "clean" and stop (no PR), OR
- 2 fix cycles used without a PASS — stop and report in the run log.
HARD CAPS (enforced outside this file, in the Routine):
- **One run per night.**
- **Never merge to `main`.** Fixes land only via a PR a human approves.

## RUN RULE
Every run STARTS by reading `MEMORY.md` and ENDS by updating it. No exceptions.
