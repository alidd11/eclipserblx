# Eclipse (eclipserblx)

A Roblox UK-roleplay marketplace: buyers browse and purchase digital assets (vehicles, uniforms, bots, VFX, scripts); sellers run stores; staff moderate via an admin dashboard. React 18 + TypeScript + Vite + Tailwind + shadcn/ui SPA (react-router-dom), Supabase backend (Postgres + Edge Functions + RLS), Stripe payments, react-i18next with 5 locales (en/fr/pt/de/es).

## Design system

- **Theming is system-only, never a manual toggle.** Dark/light follows `prefers-color-scheme` via a synchronous pre-paint script in `index.html` plus the live-updating `useSystemTheme` hook. Do not add a theme switcher UI.
- **Never hardcode colors.** Every color is a CSS custom property consumed through Tailwind's `hsl(var(--x))` pattern, defined in both the `:root` (light) and `.dark` blocks of `src/index.css` — `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `border`, `input`, `ring`, plus `neon-*`/`gradient-*`/`glow-*`/`sidebar-*` tokens. A hardcoded hex/HSL literal in a component is a bug, not a style choice — it will look right in one theme and break in the other.
- **Chart colors** come from `src/lib/chartColors.ts` (`CHART_COLORS`), backed by `--chart-1` through `--chart-10` in `index.css`. Never inline chart HSL values.
- **Loading states use skeletons, not spinners**, for anything showing list/content data. Reuse `src/components/ui/skeleton.tsx` or a page-specific skeleton component (see `src/components/purchases/PurchasesSkeletons.tsx` for the pattern) rather than a generic `<Loader2 />` spinner.
- **Empty states must be purposeful, not generic.** No bare "No results found" placeholders. Use a dashed-border banner with a clear CTA, and where possible show contextually useful fallback content instead of dead space (e.g. the cart's empty state shows trending products when the user has no browsing history, not just an empty box).
- **The bar is "enterprise," not "AI-generated."** Avoid generic icon-grid feature sections, filler copy, and cookie-cutter card layouts. Prefer editorial, intentional layouts (see `LandingTrustSignals.tsx`'s stat-band rewrite) over defaults that read as scaffolded.
- **i18n hygiene**: never leave orphaned keys in `src/i18n/locales/*.json` after removing a feature, and never add copy without adding it to all 5 locale files.

## Security patterns (Supabase)

- Every table needs RLS; every `SECURITY DEFINER` function needs `SET search_path` pinned (checked via `pg_proc.proconfig`).
- Edge functions default to `verify_jwt = false` in `supabase/config.toml` in this project — that means **the function itself** must gate access using `supabase/functions/_shared/auth-guard.ts` (`requireServiceRole` for cron/internal callers, `requireStaff`/`requireAdmin` for staff-triggered actions, `requireAuth` for any logged-in user). Never assume the gateway already checked auth just because `verify_jwt` exists as a config key — confirm the actual value.
- When placing an auth guard, call it as its own statement *after* the OPTIONS-preflight branch is fully closed — never inline it inside the `Response()` call's argument list. (A prior automated fix pasted the guard mid-argument-list across ~20 functions, producing a silent syntax error that looked fixed but wasn't; see git history around commit `0b01848` if this pattern resurfaces.)
- Public-facing "safe" views over sensitive tables (`*_public`, `*_safe`, `*_storefront`) must set `security_invoker = on` and mirror the same row filters the underlying table's RLS would apply — don't rely on the view's default definer privileges.
- Before trusting a "this is unauthenticated" finding as new, check whether the fix actually reached `main` — this repo's designated dev branch and `main` can diverge, and Lovable's own scanner/build only sees `main`.

## Workflow

- Designated dev branch: `claude/repo-overview-lx4wyo`. Commit there, push, then fast-forward/merge into `main` so Lovable's connected GitHub sync and its security scanner actually see the change.
- Verify changes with `npx tsc --noEmit` and `npx vitest run` before considering a change done.
- For anything requiring live data, real auth, or the deployed preview, delegate verification to Lovable (`query_database`/`send_message` MCP tools) rather than assuming local sandboxed checks are sufficient — this sandbox cannot reach the live Supabase API or the Lovable preview URL.
- Never use a directly-connected "Supabase" MCP tool for this app's data unless you've confirmed it points at project `qlnbergwjfrmgkjhrbkj` — a wrong-project Supabase MCP connection has shown up in this session before.
