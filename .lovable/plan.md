# Wave 6 — Strict TypeScript Engagement

## Baseline (measured, not estimated)

A temporary `tsconfig.strict.json` extending `tsconfig.app.json` with `strict: true`, `noImplicitAny: true`, `strictNullChecks: true` produces **294 errors across 115 files**.

### Error code breakdown

| Code | Count | Meaning | Typical fix |
|------|-------|---------|-------------|
| TS2345 | 83 | Argument not assignable (mostly `string \| null` → `string`) | `?? ''` / guard / narrow |
| TS2322 | 58 | Type assignment mismatch (null/undefined into non-nullable) | Make field optional or coalesce |
| TS7006 | 39 | Implicit `any` parameter | Add explicit type |
| TS18046 | 31 | `unknown` in catch blocks | `err instanceof Error ? err.message : String(err)` |
| TS2769 | 29 | No overload matches (Date/format helpers given `null`) | Guard before call |
| TS18047 | 29 | Value possibly `null` | `?.` chain or guard |
| TS2339 | 12 | Property doesn't exist | Fix type definition or narrow |
| TS18048 | 7 | Possibly `undefined` | Guard / coalesce |
| TS2538 | 5 | Type `null` cannot be used as index | Guard before lookup |
| TS18049 | 1 | Possibly `null` callable | Guard |

### File hot-spots (top 15)

```text
18  src/pages/admin/SellerPayouts.tsx
15  src/pages/admin/Affiliates.tsx
14  src/pages/admin/Users.tsx
13  src/pages/admin/SellerStoreDetail.tsx
12  src/pages/StoreAbout.tsx
10  src/pages/Featured.tsx
 8  src/pages/admin/CustomerTicketDetail.tsx
 8  src/hooks/useBackgroundPush.ts
 7  src/pages/StoreReviewsPage.tsx
 7  src/components/product/FrequentlyBoughtTogether.tsx
 6  src/pages/admin/staff-profile/useStaffProfileData.ts
 6  src/pages/admin/Categories.tsx
 6  src/pages/SearchResults.tsx
 5  src/components/admin/discord-settings/ConfigurationTab.tsx
 4× ~12 files with 4 errors each
```
Long tail: ~85 files at 1–3 errors.

## Strategy

Flip strictness incrementally — never in one commit. Land a phase, run `tsc + vitest`, ship, repeat.

### Phase A — Foundations (1 turn, low risk)

Goal: the easy wins that don't change runtime behaviour.

1. Enable **only** `useUnknownInCatchVariables: true` (it's part of `strict` already; isolate it). Fix all 31 TS18046 catch blocks with one helper:
   ```ts
   // src/lib/errors.ts (new, ~10 lines)
   export const errMsg = (e: unknown) =>
     e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
   ```
   Replace `err.message` / `e.message` with `errMsg(e)`.
2. Enable `noImplicitAny: true`. Fix 39 TS7006 — explicit annotation on event handlers, map callbacks, and a few prop destructures. Most are `(e) =>`, `(item) =>` in array callbacks where the inferred element type already exists once `noImplicitAny` is on.

**End-of-phase gate:** `tsc -p tsconfig.app.json --noEmit` clean with those two flags on. Do **not** enable `strictNullChecks` yet.

### Phase B — Null-safety primitives (2 turns)

Goal: clean the null/undefined plumbing in shared layers before page code.

1. Tighten generated-adjacent helper types where pages routinely pass nullable Supabase columns into formatters:
   - `src/lib/formatters.ts` — `formatGBP`, `formatRelative`, `formatDate` accept `string | number | Date | null | undefined` and return `'—'` for nullish (already done in some, audit + finish).
   - `src/utils/optimizeImageUrl.ts` — already handles `null | undefined`. Verify call sites.
2. Add narrow guards to `src/lib/mediaUtils.ts` re: image array filtering.
3. Fix `src/hooks/useBackgroundPush.ts` (8 errors) and `src/hooks/useBiometricAuth.ts` (3) — these are leaf hooks consumed everywhere; fixing them removes downstream noise.

**Gate:** error count drops by ~40 without `strictNullChecks` flipped.

### Phase C — Flip `strictNullChecks` and burn down (3–4 turns)

Order chosen to minimise blast radius (low-traffic admin pages first, marketplace last):

| Turn | Files | Errors to clear |
|------|-------|-----------------|
| C1 | `admin/SellerPayouts.tsx`, `admin/Affiliates.tsx`, `admin/Users.tsx`, `admin/SellerStoreDetail.tsx` | 60 |
| C2 | `admin/CustomerTicketDetail.tsx`, `admin/Categories.tsx`, `admin/staff-profile/useStaffProfileData.ts`, `admin/discord-settings/ConfigurationTab.tsx`, all admin files at 2–3 errors | ~50 |
| C3 | `pages/StoreAbout.tsx`, `pages/StoreReviewsPage.tsx`, `pages/Featured.tsx`, `pages/SearchResults.tsx`, `pages/ProductDetail.tsx`, `components/product/FrequentlyBoughtTogether.tsx` | ~50 |
| C4 | Long tail — 85 files at 1–3 errors, mechanical | ~50 |

Dominant fix patterns (apply consistently; do **not** invent ad-hoc shapes):

- `value ?? ''` for string defaults
- `value ? new Date(value) : null` before `format()` calls
- Optional chaining for chained DB joins (`row.profiles?.username ?? 'Unknown'`)
- Narrow `null` out at the top of a function with an early return rather than threading nullable through callees

### Phase D — Lock it in (1 turn)

1. Flip `tsconfig.app.json`: `strict: true`, drop `strictNullChecks: false`, keep `noUnusedLocals: false` / `noUnusedParameters: false` (out of scope — not part of strict).
2. Mirror in root `tsconfig.json` so editors agree.
3. Add a **non-blocking** strict-check note to `.lovable/plan.md` (no CI workflow — that would be new implementation per your prior directive).

## Out of scope (explicit)

- `noUnusedLocals`, `noUnusedParameters` — large dead-code purge, separate engagement.
- `noImplicitReturns`, `noFallthroughCasesInSwitch` — separate.
- Edits to `src/integrations/supabase/types.ts` — auto-generated, never touched.
- Refactoring `any` casts in 3rd-party shim files (`portalBotFiles.ts` data, etc).

## Risks

- Phase C touches admin pages used by staff. Each turn ends with `tsc + vitest run` and a smoke-check of the affected route in preview before moving on.
- A few TS2769 errors in `PaymentRequestButton.tsx` are Stripe SDK overload mismatches — may require `as` cast, flagged in Phase C3.
- No runtime behaviour should change. Any fix that needs a logic change (not just a guard) gets called out in the turn note rather than silently inlined.

## Estimated total

**7 turns** (A:1, B:2, C:3–4, D:1). Reversible at every gate — each phase commits independently.

## Approval

Reply with the phase you want started (default: Phase A) or "all phases" to proceed end-to-end without intermediate confirmation.
