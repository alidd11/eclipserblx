## Deep Audit — What I Checked

I ran the full diagnostic suite against the codebase and live backend:

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Clean |
| Vitest (91 tests) | ✅ All pass |
| ESLint | 995 errors, **all pre-existing `any`** (per memory: strict 'any' floor, leave alone) |
| Supabase linter | 307 issues, **all WARN-level**, all pre-existing categories (extension in public, public bucket listing, security definer execute) |
| Auth logs | One 403 "missing sub claim" — **already handled** by `useAuth.tsx:115` auto-refresh |
| Edge function logs | `image-proxy` spamming `BadResource: Bad resource ID` ⚠️ |
| Console logs (preview) | Empty |

## Actual Issues Worth Fixing

Only two genuine, non-cosmetic problems surfaced. Everything else is either a pre-existing tolerated baseline or already mitigated.

### 1. `image-proxy` log spam — `BadResource: Bad resource ID`

**Symptom:** Every image request that the client aborts mid-flight (fast scroll, route change, image swap) logs an error stack. This is filling the edge function log with noise and makes real errors hard to spot.

**Root cause:** We return `new Response(response.body, …)` — a streamed pass-through. When the downstream client closes the connection before Deno finishes piping, the underlying resource is freed but Deno still tries `respondWith` on it, throwing `BadResource`. The error is swallowed by the platform but emitted to logs.

**Fix:** Buffer the upstream body into bytes (`arrayBuffer()`) before responding. Images are already small (≤a few MB after Supabase render-endpoint resize) and this kills the spam entirely. We also add an `AbortSignal` tied to `req.signal` so an aborted client cancels the upstream fetch instead of leaking it.

Same fix applied to the fallback branch.

### 2. `image-proxy` fallback drops cache vary

**Symptom:** When the Supabase render endpoint 404s and we fall through to the raw object URL, we forward `Content-Length` / `ETag` from upstream but skip `Vary: Accept` (it's only in `CACHE_HEADERS` which we *do* spread, so this is actually fine on re-read).

**Re-classified:** Not a bug. No action.

## What I Am NOT Touching

- **307 Supabase linter warnings** — all pre-existing categories (public buckets need to be public for storefronts; `security_definer` functions are intentional per memory `[RLS User Access]` and `[View Security Isolation]`). Touching these would break working features.
- **995 ESLint `any` errors** — memory `[Codebase Modularization Limit]` explicitly sets a strict 'any' floor. Bulk-typing them is a refactor, not a fix.
- **Auth `bad_jwt` 403** — already handled. The browser sends one stale token after a long idle, `useAuth` detects "missing sub claim", refreshes, succeeds. Working as designed.
- **`STRIPE_CONNECT_CLIENT_ID` / `SENTRY_DSN`** — confirmed last turn as accepted-blocked, no functional impact.
- **No new features.** Per memory: FIX + OPTIMISATION only.

## Files Touched

- `supabase/functions/image-proxy/index.ts` — buffer body, propagate `req.signal` to upstream `fetch`, identical behaviour for the client.

That's the entire change set. ~15 lines edited in one file. Zero risk to product surface area.
