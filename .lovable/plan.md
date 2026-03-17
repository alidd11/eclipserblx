

## Full End-to-End Audit Report

---

### CRITICAL (Must Fix)

**1. `PWADiscordBanner` missing `forwardRef` — Console error on every landing page load**
- **File**: `src/components/landing/PWADiscordBanner.tsx`
- The component is lazy-loaded inside a `ScrollReveal` (which passes a ref via `Suspense`), but the exported `PWADiscordBanner` function (line 22) is a plain function component — not wrapped with `forwardRef`.
- The inner `DiscordLogo` SVG uses `forwardRef`, but the outer component does not.
- **Fix**: Wrap the exported component with `forwardRef<HTMLDivElement>` and attach `ref` to the outer `<a>` element.

**2. `import-external-products` edge function still generates legacy UUID slug suffixes**
- **File**: `supabase/functions/import-external-products/index.ts` (lines 1604-1607 and 1787-1789)
- Two code paths still append `crypto.randomUUID().slice(0, 8)` to product slugs, contradicting the new deterministic slug system.
- **Fix**: Replace with the same clean slug logic used in the seller pages (derive from name, retry with collision suffix only on `23505` error).

---

### HIGH (Should Fix)

**3. Database: 4 functions missing `search_path` — Security linter warnings**
- The email-queue helper functions (`enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`) are `SECURITY DEFINER` but don't set `search_path = public`.
- This is a search-path injection risk on security-definer functions.
- **Fix**: Run a migration adding `SET search_path = public` to each of these 4 functions.

**4. Database: `game_news_posted` has an overly permissive RLS policy**
- Policy "Service can insert posted" uses `WITH CHECK (true)` for INSERT, meaning any authenticated user could insert rows.
- **Fix**: Tighten to require admin role via `has_role(auth.uid(), 'admin')` or restrict to service-role only.

**5. Database: Extension installed in `public` schema**
- The linter flagged an extension in the `public` schema. Best practice is to use a dedicated `extensions` schema.
- **Risk**: Low immediate impact, but noted for hygiene. Can be deferred.

---

### MEDIUM (Recommended)

**6. Seller product creation has fallback UUID slug on collision retry**
- **Files**: `src/pages/seller/SellerProductEditor.tsx` (line 422), `src/pages/seller/SellerProducts.tsx` (line 252)
- Both files use `crypto.randomUUID().slice(0, 8)` in the collision-retry path. While this is only triggered on duplicate slugs, it reintroduces the random suffix pattern.
- **Fix**: Use `product_number` or a sequential counter as the collision tiebreaker instead of a random UUID.

---

### LOW / INFORMATIONAL

**7. Route coverage — no dead routes found**
- All 150+ routes in `AppRoutes.tsx` have corresponding lazy-loaded page components. Legacy routes properly redirect via `<Navigate replace />`.
- The catch-all `*` route correctly renders `NotFound`.

**8. Performance architecture is sound**
- Critical CSS is inlined in `index.html`. Fonts are preloaded. Hero images use `fetchpriority="high"`.
- Non-critical components (`ChatWidget`, `CookieConsentBanner`, etc.) are lazy-loaded with `Suspense fallback={null}`.
- `framer-motion` is isolated to non-critical paths. `PageTransition` uses CSS-only animation.
- Manual chunk splitting in Vite config properly separates vendor bundles.
- Query client uses 5-minute stale time and 30-minute GC to reduce refetches.

**9. Responsive design patterns are consistent**
- Mobile tabs use `Select` dropdown pattern (per project memory). Tables convert to card layouts below `md`.
- Header uses `position: fixed` with safe-area spacing on mobile. Tab bar uses `--tab-bar-height` CSS variable.
- `viewport-fit=cover` and `interactive-widget=resizes-content` are correctly set.

**10. No duplicate pages or redundant route definitions found**
- `/purchases`, `/downloads`, `/orders` all intentionally point to `MyPurchases` (aliased routes, not duplication).
- `/marketplace` correctly aliases to `Products`.

**11. `generateSlug` usage is appropriate in remaining files**
- `SellerSettingsProfile.tsx` — generates store slugs (stores still need text slugs).
- `admin/Categories.tsx` — generates category slugs (categories still need text slugs).
- These are correct and should NOT be removed.

**12. No database errors in recent logs**
- Postgres error logs are clean. Edge function error logs show no 4xx/5xx responses.

---

### Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | Needs fix |
| High | 3 | Needs fix (2 DB migrations + 1 deferred) |
| Medium | 1 | Recommended |
| Low/Info | 6 | Clean — no action needed |

### Implementation Plan

1. **Wrap `PWADiscordBanner` with `forwardRef`** — add ref to outer `<a>` element
2. **Update `import-external-products` edge function** — replace 2 UUID slug generation blocks with deterministic slug + collision retry logic
3. **DB migration** — set `search_path = public` on 4 email-queue functions
4. **DB migration** — tighten `game_news_posted` INSERT policy
5. **Optional** — replace UUID fallback in seller collision-retry paths with `product_number`-based suffix

