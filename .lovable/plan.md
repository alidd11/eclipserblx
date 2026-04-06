

## Enterprise Payment & Auth Audit — Findings & Fixes

### What I Checked

I audited the full payment pipeline (PaymentIntent creation, Stripe webhook fulfillment, Checkout sessions, saved payment methods) and all authentication flows (email/password, Google, Apple, Discord, Roblox) against enterprise standards.

### Security Scan Results

The automated security scan surfaced **3 findings**:

| Severity | Finding | Impact |
|---|---|---|
| **Critical** | Product-images storage bucket lets any seller delete/overwrite other sellers' images | Data integrity / vandalism risk |
| **Critical** | No Realtime channel authorization — any authenticated user can subscribe to any topic | PII leakage (support tickets, push keys, chat) |
| **Warning** | Extensions installed in the `public` schema | Best-practice hygiene |

---

### Finding 1: Deleted Functions Still Called (Breaks Payout Flow)

The `stripe-webhook` handler (lines 146 and 160) still calls `check-wise-funding` and `check-paypal-funding` — both were **deleted** in the cleanup round. When a `payout.paid` event fires for Wise or PayPal funding, the webhook silently fails these fetch calls. While wrapped in try/catch so it doesn't crash, **the downstream funding status check never runs**.

**Fix**: Remove the two dead `fetch()` calls from `stripe-webhook/index.ts`. The `wise_funding_requests` table status is already updated to `'paid'` on the lines above — the downstream check functions were redundant.

---

### Finding 2: Orphaned `purchase-ad-pings` Function

`purchase-ad-pings` is a legacy Stripe Checkout-based function with **zero frontend callers**. Ad ping purchases now go through `create-payment-intent` with `type: 'ad_pings'`. This function should be deleted — it duplicates pricing logic and adds maintenance/attack surface.

**Fix**: Delete `supabase/functions/purchase-ad-pings/` and remove its config entry from `supabase/config.toml`.

---

### Finding 3: Google/Apple OAuth Bypasses Lovable Cloud Bridge

`SocialLoginButtons.tsx` calls `supabase.auth.signInWithOAuth()` directly for Google and Apple. The project has the Lovable Cloud auth bridge (`src/integrations/lovable/index.ts`) which should be used instead — it handles token exchange and session setting properly. Direct calls can cause session mismatches on custom domains.

**Fix**: Update `SocialLoginButtons.tsx` to import from `@/integrations/lovable` and use `lovable.auth.signInWithOAuth('google')` / `lovable.auth.signInWithOAuth('apple')` instead of the direct Supabase call.

---

### Finding 4: Product-Images Storage Bucket Missing Path-Ownership Check

The `product-images` bucket RLS policies only verify the user owns *any* store, not that the file path belongs to *their* store. Any seller can overwrite or delete another seller's product images.

**Fix**: Add a path-ownership condition to the INSERT/UPDATE/DELETE policies:
```sql
(stores.id)::text = split_part(objects.name, '/', 1)
```
This matches the pattern already used on the `product-assets` bucket.

---

### Finding 5: No Realtime Channel Authorization

The `realtime.messages` table has no RLS policies. Any authenticated user can subscribe to any channel, exposing data from `support_tickets`, `notifications`, `chat_messages`, and `push_subscriptions`.

**Fix**: Add RLS policies on `realtime.messages` that scope channel access by topic pattern and `auth.uid()`.

---

### Summary

| Priority | Fix | Effort |
|---|---|---|
| **P0 — Critical** | Fix product-images storage ownership check | Migration |
| **P0 — Critical** | Add Realtime channel authorization | Migration |
| **P1 — Breaking** | Remove dead `check-wise-funding` / `check-paypal-funding` calls from webhook | 2 lines |
| **P1 — Cleanup** | Delete orphaned `purchase-ad-pings` function | Delete directory |
| **P2 — Auth** | Switch Google/Apple OAuth to Lovable Cloud bridge | Edit 1 file |

### Files Changed
- `supabase/functions/stripe-webhook/index.ts` — Remove dead fetch calls to deleted functions
- **Delete** `supabase/functions/purchase-ad-pings/` — Orphaned, replaced by `create-payment-intent`
- `supabase/config.toml` — Remove `purchase-ad-pings` entry
- `src/components/auth/SocialLoginButtons.tsx` — Use `lovable.auth.signInWithOAuth` for Google/Apple
- **Migration** — Fix `product-images` bucket policies with path-ownership check
- **Migration** — Add `realtime.messages` RLS policies for channel authorization

