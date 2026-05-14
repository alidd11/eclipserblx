## Full Remediation Plan — Fix Everything

Goal: clear every real issue surfaced by the audit. No new features. Grouped into waves you approve in order — each wave is independently shippable and reversible.

---

### Wave 1 — Quick Wins (low risk, ~1 turn)

1. **Strip stray `console.log`** in `SecureCodeInput.tsx` and `BotIntegrationGuide.tsx`.
2. **Fix React DOM warning** — `EclipseLogo.tsx` uses `fetchPriority` (camelCase) on a plain `<img>`; React wants lowercase `fetchpriority`. Visible in console right now.
3. **Silence React Router v7 deprecation warnings** — add `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to `<BrowserRouter>` in `App.tsx`. Removes two warnings on every page load.
4. **Remove `bun add` artifact** — the `lovable.js` "Unknown message type: RESET_BLANK_CHECK" warning is platform-side; nothing to fix, just confirming.

### Wave 2 — Dependency & Bundle Hygiene (~1–2 turns)

5. **Align Radix UI versions** — 27 packages pinned to ancient majors (`1.0.x`, `1.1.2`), 5 floating. Bump them all to the latest `^1.x` in one pass, run `bun install`, smoke-test dialogs/popovers/tooltips.
6. **Add `rollup-plugin-visualizer`** to `vite.config.ts` (dev-only). Generate a one-off `stats.html` so we can see the actual heavy chunks before optimising further.
7. **Audit eager-imported heavy pages in `AppRoutes.tsx`** (38 KB file). Convert any non-critical route still using static `import` to `lazy()`.

### Wave 3 — Oversized Files (~2–3 turns)

8. **Split `admin/Products.tsx` (42 KB)** into table / filters / bulk-action sub-components.
9. **Split `AppRoutes.tsx` (38 KB)** into route-group files (`adminRoutes.tsx`, `sellerRoutes.tsx`, `publicRoutes.tsx`, `botRoutes.tsx`).
10. **Split `Account.tsx`, `CustomerTicketDetail.tsx`, `IncomeSources.tsx`, `SellerAnalytics.tsx`, `SellerLeakReports.tsx`, `SellerSettingsAppearance.tsx`, `StaffChatRoom.tsx`** — one per turn, behaviour preserved, components extracted alongside.

### Wave 4 — Edge Function Standardisation (~2 turns)

11. **Adopt `_shared/edge-response.ts` everywhere** — it already exists. Sweep the 167 functions, replace local `corsHeaders` declarations, and use `jsonOk` / `jsonError` / `unauthorized` etc. Cuts ~3 KB per function and removes duplicate-identifier risk.
12. **Apply the `image-proxy` abort/buffer fix pattern** to other functions that stream upstream bodies (e.g. `download-asset`, anything fetching external HTTP). Same `req.signal` propagation + `arrayBuffer()` buffering.
13. **Add a shared `_shared/rate-limit.ts`** (token bucket keyed on `auth.uid()` or IP) and apply it to the obvious abuse vectors: `ai-chat-support`, `check-nsfw`, `auto-detect-leaks`, `discord-auth-url`. Memory `[Infrastructure Hardening]` already specifies `X-RateLimit-Remaining` headers — bring functions inline.

### Wave 5 — Image Pipeline (~1 turn)

14. **Extend `image-proxy` allow-list** to Discord CDN (`cdn.discordapp.com`), Roblox CDN (`tr.rbxcdn.com`, `t1-tr.rbxcdn.com`), and our own published domain. Currently external avatars/thumbs bypass the cache layer entirely.
15. **Add a small `<Img srcSet>` helper** that emits `1x / 2x` `srcset` from `optimizeImageUrl(width)` — use it in product cards, hero, and avatar components. Roadmap Phase 11 already promises this.

### Wave 6 — TypeScript Strictness (multi-turn, biggest payoff)

16. **Flip `tsconfig.app.json` to `strict: true`** and fix the resulting errors in waves:
    - 16a. Auth + payments paths (`useAuth`, Stripe edge functions, cart, checkout)
    - 16b. Hooks layer (`src/hooks/*`)
    - 16c. Pages layer
    - 16d. Component leaves
    
    Track the error count down after each pass. Memory `[Codebase Modularization Limit]` "strict any floor" → updated to "strict any **ceiling**, trending to zero".

### Wave 7 — Test Coverage on Money Paths (~2 turns)

17. **Add tests for cart maths** — discount tiers (`[Pricing Discount Hierarchy]`), VAT, multi-store split.
18. **Add tests for Stripe webhook signature handling** — `confirm-embedded-payment`, `customer-portal` callback, payout splits.
19. **Add tests for RLS-sensitive reads** — `usePublicProduct`, `usePublicStore`, `useStoreAccess`.

### Wave 8 — Observability & CI (~1 turn)

20. **Sentry is already configured** (DSN hard-coded in `src/lib/sentry.ts`) — confirm production events arrive, then **remove the @security-memory note** about it being unset (was stale audit finding).
21. **Add a request-id** header in `supabase/client` interceptor + log it on the edge function side. Lets us correlate one user action across browser → function → DB.
22. **Add a `.github/workflows/ci.yml`** running `tsc --noEmit`, `vitest run`, `eslint .`, and `supabase db lint` on every PR. This is the single biggest preventer of regressions.

### Wave 9 — Service Worker & PWA (~1 turn)

23. **Audit `public/custom-sw.js` vs the auto-generated SW** — pick one, delete the other, document in memory.

---

## What's Already OK (closing prior audit gaps)

- React Query defaults — `App.tsx` already sets `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false`, `retry: 1`. ✅ No change needed.
- Sentry DSN — actually configured. ✅
- `_shared/edge-response.ts` exists. We just need to adopt it.

---

## Sequencing & Risk

```text
Wave 1  ──► Wave 2  ──► Wave 3  ──► Wave 4  ──► Wave 5
   ▲                                              │
   │                                              ▼
Wave 9 ◄── Wave 8 ◄── Wave 7 ◄── Wave 6 ◄────────┘
```

- Waves 1–5 are mechanical and reversible.
- Wave 6 (strict TS) is the largest and where regressions are most likely; it goes after the dependency/bundle cleanup so we're not chasing types in code that's about to be deleted.
- Waves 7–9 lock in quality so we don't slide back.

**Estimated turns: ~15 total.** I'll execute one wave per approved turn, run the full diagnostic suite (`tsc`, `vitest`, `eslint`, supabase linter, edge logs) after each, and report deltas.

Reply "go" to start with Wave 1, or name a wave to start there.
