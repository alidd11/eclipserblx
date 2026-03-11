
Comprehensive check result: I found a concrete root cause plus a few remaining consistency gaps.

1) What is broken right now
- The Cloudflare worker generator still builds product OG lookups by `slug` only (`deploy-cloudflare-worker` → `pOg(slug)` with `slug=eq.<value>`).
- Numeric links like `/products/13` are matched, but then looked up as slug `"13"`, so the worker falls back to the generic site HTML (exactly what your Discord screenshot shows).
- I verified this behavior path is active: `test-worker-bot` returned generic page meta, not product OG, even for an existing active product slug.
- Database state is good: product numbers exist for all products, no nulls/duplicates, and affected products have images.
- `og-proxy` function endpoint currently returns 404 when called directly (so app share links using that endpoint are currently unreliable).

2) One-pass fix plan (no partial patching)
- Update `supabase/functions/deploy-cloudflare-worker/index.ts` worker script builder:
  - Change product resolver to accept `token` and detect numeric vs slug.
  - Numeric token → query by `product_number`.
  - Non-numeric token → query by `slug`, but canonical OG URL should still point to numeric URL when available.
  - URL-encode filter values safely in generated script.
  - Keep fallback to default page only when product truly not found.
- Ensure worker responses include diagnostic header values for hit/miss (`X-Eclipse-Worker`) so we can prove behavior quickly.
- Redeploy worker by invoking `deploy-cloudflare-worker` after code update.

3) Clean all remaining product URL emitters to numeric-first
- Backend functions:
  - `supabase/functions/notify-new-product/index.ts` (currently slug-only links).
  - `supabase/functions/submit-indexnow/index.ts` (currently submits slug URLs).
- Frontend helpers/callers:
  - `src/lib/submitIndexNow.ts` (currently `submitProductUrl(slug)`).
  - Call sites in:
    - `src/pages/admin/Products.tsx`
    - `src/pages/seller/SellerProductEditor.tsx`
  - Switch to passing/storing `product_number` for product URL submission and notifications.
- Keep slug fallback only where it serves backward compatibility (not for new outgoing links).

4) Share-link reliability fix
- `src/pages/ProductDetail.tsx` currently builds share URL using `/functions/v1/og-proxy?...`.
- Replace with stable public product URL (`https://eclipserblx.com/products/<product_number>`) once worker fix is live.
- This removes dependency on a function endpoint that is currently returning 404.

5) End-to-end verification checklist (must all pass)
- Worker direct bot tests:
  - Existing slug product URL returns product OG title/image.
  - Existing numeric product URL returns same product OG title/image.
  - Nonexistent product URL falls back cleanly.
- Discord real-world test:
  - Post one slug URL + one numeric URL in Discord and confirm both show correct product image/title (not generic Eclipse card).
- Functional consistency:
  - New product notifications generate numeric URLs.
  - Index submission payload contains numeric product URLs.
  - Product share button sends a working public URL.

Technical details (implementation targets)
- Primary root-cause file: `supabase/functions/deploy-cloudflare-worker/index.ts` (generated worker logic is stale for numeric routing).
- Secondary consistency files:
  - `supabase/functions/notify-new-product/index.ts`
  - `supabase/functions/submit-indexnow/index.ts`
  - `src/lib/submitIndexNow.ts`
  - `src/pages/admin/Products.tsx`
  - `src/pages/seller/SellerProductEditor.tsx`
  - `src/pages/ProductDetail.tsx`

Execution order
1. Fix worker generator logic.
2. Deploy worker.
3. Update URL emitters to numeric-first.
4. Run full verification matrix (including Discord live test).
5. Only then close the issue.
