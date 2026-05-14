# Wave 6 — Phases B → D (revised against post-A baseline)

## Current measured baseline (after Phase A)

| Flag combo | Errors |
|------------|--------|
| Full `strict: true` | **253** (down from 294) |
| `noImplicitAny` only | 78 (across 22 files) |
| `strictNullChecks` only | 210 (across 78 files) |

Error code mix (full strict): TS2345 ×83, TS2322 ×58, TS7006 ×39, TS2769 ×29, TS18047 ×29, TS18048 ×7, TS2538 ×5, TS2339 ×2, TS18049 ×1.

## Revised Phase B — `noImplicitAny` (1 turn, ~78 errors)

Originally this was bundled into Phase A; pulling it out cleanly because it cascades into TS7010/7018 (no return-type) and TS7031 (binding-element any).

**Files (top 8 = 51 of 78 errors):**
- `src/pages/admin/Affiliates.tsx` (15) — `reduce` accumulator types missing
- `src/pages/admin/Users.tsx` (11)
- `src/components/seo/StructuredData.tsx` (7)
- `src/hooks/useSubscription.ts` (6)
- `src/pages/bot/BotCommunity.tsx` (4)
- `src/pages/bot/BotAnalytics.tsx` (3)
- `src/pages/bot/BotModeration.tsx`, `BotAutoMod.tsx`, `admin/InternalNotes.tsx`, `BotDashboard.tsx`, `admin/twitter/TwitterMentions.tsx` (2 each)
- Long tail: 11 files at 1 error each.

**Fix patterns:**
- Array/reduce callbacks: explicit element type from the source array (`(sum: number, c: typeof items[number]) => …`).
- Event handlers: `(e: React.ChangeEvent<HTMLInputElement>) =>` etc.
- Function return types where TS7010 fires: add explicit return annotation, no inference change.

**Gate:** flip `noImplicitAny: true` in `tsconfig.app.json`. `tsc + vitest` clean.

## Revised Phase C — `strictNullChecks` burn-down (3 turns, ~210 errors across 78 files)

### C1 — Shared null-safety primitives first (1 turn, ~30 errors removed downstream)

Tighten leaf modules so admin/page fixes don't repeat the same coalescing:

- `src/lib/formatters.ts` — confirm/extend `formatGBP`, `formatRelative`, `formatDate` to accept `string | number | Date | null | undefined` returning `'—'` on nullish.
- `src/lib/mediaUtils.ts` — narrow guards for nullable image arrays.
- `src/hooks/useAnalyticsData.ts` (6) — leaf hook.
- `src/hooks/useBackgroundPush.ts`, `useBiometricAuth.ts` — verify Phase A null fixes hold under strictNullChecks.
- `src/components/seller/ProductHealthDonut.tsx` (4) — small chart helper used by multiple seller pages.

### C2 — Admin pages (1 turn, ~70 errors)

Order = blast radius low → medium:

| File | Errors |
|------|--------|
| `admin/SellerPayouts.tsx` | 18 |
| `admin/SellerStoreDetail.tsx` | 13 |
| `admin/CustomerTicketDetail.tsx` | 8 |
| `admin/Categories.tsx` | 6 |
| `admin/staff-profile/useStaffProfileData.ts` | 6 |
| `admin/disputes/DisputeDetailDialog.tsx` | 3 |
| `admin/Referrals.tsx`, `Disputes.tsx`, `BotCodes.tsx` | 3 each |
| Tail: ~12 admin files at 1–2 each | ~12 |

### C3 — Marketplace + storefront + long tail (1 turn, ~110 errors)

| File | Errors |
|------|--------|
| `pages/StoreAbout.tsx` | 12 |
| `pages/Featured.tsx` | 10 |
| `pages/StoreReviewsPage.tsx` | 7 |
| `components/product/FrequentlyBoughtTogether.tsx` | 7 |
| `pages/SearchResults.tsx` | 6 |
| `pages/seller/SellerCustomerInsights.tsx` | 4 |
| `pages/SupportTicketDetail.tsx` | 4 |
| `components/search/SearchCommandPalette.tsx` | 4 |
| `pages/ProductDetail.tsx` | 3 |
| Tail: ~50 files at 1–2 each | ~63 |

**Dominant fix patterns (applied uniformly):**
- `value ?? ''` for non-nullable string defaults
- `value ? new Date(value) : null` before `format()` / date helpers
- Optional chaining for joined Supabase rows (`row.profiles?.username ?? 'Unknown'`)
- Early `if (!x) return null` to narrow nullable out at the top of components rather than thread through callees

## Phase D — Lock it in (1 turn)

1. Flip `tsconfig.app.json`: enable `strict: true`. Drop the standalone `useUnknownInCatchVariables` line (now subsumed). Keep `noUnusedLocals: false`, `noUnusedParameters: false`.
2. Mirror in root `tsconfig.json` so the editor and CLI agree.
3. Update `.lovable/plan.md` summary noting Wave 6 complete.

## Out of scope (re-confirmed)

- `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — separate dead-code engagement.
- `src/integrations/supabase/types.ts` — auto-generated, never edited.
- New CI workflow — would be new implementation per prior directive.

## Risk controls (per turn)

- After every turn: `tsc --noEmit`, `vitest run`, smoke-check affected route in preview.
- Stripe SDK overload (TS2769 in `PaymentRequestButton.tsx`) — flagged for a single `as` cast, called out in the C-turn note rather than buried.
- No runtime behaviour changes. Any guard that would change a code path gets called out per file.

## Estimated total

**5 remaining turns** (B:1, C:3, D:1).

## Execution mode

User selected "all phases" — proceed end-to-end through B → D without intermediate confirmation. Each turn ends with the tsc + vitest gate; if either breaks, stop and report rather than continuing.
