# Stability Sweep — Errors, Warnings, Inconsistencies

A focused, FIX + OPTIMISATION pass on signal-backed issues currently visible in console, network, auth logs, and the Supabase linter. No new features, no UI direction changes.

## Findings by signal

### A) Frontend console — recurring React DOM warning
**Symptom:** Every render of the landing page logs `Warning: React does not recognize the 'fetchPriority' prop on a DOM element. ... spell it as lowercase 'fetchpriority' instead.`

**Cause:** React 18 doesn't know the camelCase `fetchPriority` prop; it must be passed as the lowercase HTML attribute `fetchpriority`. Three call sites still use the camelCase form:
- `src/components/ui/ProductCard.tsx:155`
- `src/components/home/MarketplaceSection.tsx:165`
- `src/components/landing/HeroBanner.tsx:14`

`src/components/ui/EclipseLogo.tsx:40` already shows the correct workaround pattern.

**Impact:** Pure noise in dev console; fires on every product card render (potentially hundreds per page).

### B) Auth logs — `bad_jwt` / "missing sub claim" 403s on `/user`
**Symptom:** Repeating 403s from the published origin against `/user`.

**Cause:** Code paths calling `supabase.auth.getUser()` before a session exists, or with a stale token that the SDK hasn't refreshed yet. There are 14 call sites (mostly admin/seller pages where a session is already guaranteed — those are fine), but a few may run pre-session:
- `src/hooks/useRoadmapStatus.ts:63`
- `src/components/seller/FileReviewConsentBanner.tsx:56`
- `src/hooks/useGlobalGuardLimits.ts:16` / `useGlobalGuardData.ts`

**Impact:** Cosmetic in logs; not user-visible. Worth gating these calls behind `useAuth().user?.id` rather than calling `getUser()` cold.

### C) Supabase linter — 307 warnings, almost entirely two patterns
1. **`SECURITY DEFINER` functions executable by `anon` and `authenticated`** (≈ 290 of 307). Most of these functions are correctly DEFINER (needed to bypass RLS for trusted reads) but should have `EXECUTE` revoked from `anon` and/or `authenticated` where the function is staff-only or internal-only.
2. **Public buckets allow listing** (4 buckets). The public SELECT policy is broad — anyone can `LIST` every object in the bucket, not just `GET` known paths.
3. **Extension in `public`** (1 — pgcrypto/vector, non-actionable without disruption).

**Impact:** No active exploit, but a real hardening gap. A leaked anon key currently lets a caller probe every staff-only function and enumerate every public bucket's contents.

## Plan

### Step 1 — Fix `fetchPriority` casing (3 files, no logic change)

In `ProductCard.tsx`, `MarketplaceSection.tsx`, and `HeroBanner.tsx`, replace the JSX attribute `fetchPriority="..."` with the spread-attribute pattern already used in `EclipseLogo.tsx`:

```tsx
{...({ fetchpriority: priority ? 'high' : 'low' } as Record<string, string>)}
```

Eliminates the recurring DOM warning across landing, marketplace, and product grids.

### Step 2 — Gate cold `getUser()` calls (3 files)

In `useRoadmapStatus.ts`, `FileReviewConsentBanner.tsx`, `useGlobalGuardLimits.ts`, replace `supabase.auth.getUser()` with `useAuth().user`. If a call really needs the freshest token, wrap in:

```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;
```

Removes the recurring `bad_jwt` log entries without changing behaviour for signed-in users.

### Step 3 — Revoke `EXECUTE` on internal/staff-only `SECURITY DEFINER` functions (one migration)

Audit the function catalog and revoke `EXECUTE` from `anon` (and from `authenticated` where applicable) on functions that are only ever called by triggers, edge functions (using the service role), or staff RPCs. Concretely:
- Keep `EXECUTE` for `has_role`, `has_permission`, `has_store_access` (called from RLS — safe).
- Revoke from `anon` on every other SECURITY DEFINER function.
- Revoke from `authenticated` on functions used only inside triggers / by service role (e.g. `assign_default_roles`, audit-log writers, payout helpers).

This is the cleanest way to bring the 290 lint warnings down to a handful of legitimate exceptions.

### Step 4 — Tighten public bucket listing (one migration)

For each of the 4 buckets the linter flagged, replace the broad public `SELECT` policy with one that allows reads only when a specific object name is requested (no anonymous `LIST` at the bucket root). Existing per-folder policies stay; only the broad list policy is removed.

### Step 5 — Verify

- `tsc --noEmit -p tsconfig.app.json` — must pass.
- Re-run `supabase--linter` — expect ~290 SECURITY DEFINER warnings to drop, leaving < 10 legitimate ones.
- Reload the landing page in preview — no more `fetchPriority` warning in console.
- Watch auth logs for 5 minutes — `/user` `bad_jwt` count should fall to near zero.

## Out of scope

- The `Extension in public` lint (pgcrypto/vector) — moving these is disruptive and not security-impacting in practice.
- Any UI redesign, new features, or RBAC changes — that work is complete from the previous loops.
- The 14 remaining `getUser()` callers in admin/seller pages where a session is already guaranteed by route guards.

## Risk

Low.
- Steps 1 and 2 are pure frontend with no behaviour change.
- Step 3 only revokes EXECUTE — if a function was actually being called from the frontend, that call would already require a privileged role; revoking from anon/authenticated then makes the original assumption explicit. Each function will be checked against actual usage in `src/` before revocation.
- Step 4 narrows bucket access from "list everything" to "fetch by known name", which matches how the app already uses these buckets (we always know the path).
