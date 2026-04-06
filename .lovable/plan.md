

## Enterprise Security Audit — Full Results

### Current Security Posture: Strong (85/100)

224 tables, 87+ edge functions, comprehensive RLS — this is already well above average. The scan found **2 active vulnerabilities** that need fixing and **2 warnings** worth addressing.

---

### Critical Findings (Must Fix)

**1. Discount Codes Exposed to All Authenticated Users**
- **Risk**: Any logged-in user can query `seller_discount_codes` and read all active codes (including private/influencer codes) from every store
- **Policy**: `is_active = true` with no store or user scoping
- **Fix**: Replace the broad SELECT policy with one scoped to store owners/team members, and move code validation to a server-side RPC that checks without exposing all codes

**2. Realtime Channel Authorization Missing**
- **Risk**: Any authenticated user can subscribe to any Realtime channel topic — including `notifications`, `seller_notifications`, `push_subscriptions` (contains push endpoint URLs and crypto keys), and `bot_installation_codes` (plaintext codes)
- **Fix**: Add RLS policies on `realtime.messages` that scope channel access by topic prefix and `auth.uid()`

---

### Warnings (Should Fix)

**3. Domain Verification Tokens Readable by Anonymous Users**
- **Risk**: The `store_domains` policy exposes `verification_token` and `cloudflare_hostname_id` to unauthenticated visitors
- **Fix**: Restrict anonymous SELECT to only `domain`, `store_id`, `is_primary` columns — use a security-definer view or restrict the policy

**4. Extension in Public Schema**
- **Risk**: Low — `pg_net` is in the public schema
- **Status**: Already ignored with valid justification (required for edge function webhooks, only callable by service_role)

---

### Informational (Already Mitigated)

| Finding | Status |
|---|---|
| Edge function logging | ✅ Acceptable — no secrets logged, server-side only |
| Public forms PII collection | ✅ Acceptable — rate-limited, staff-only read access |
| Service role RLS bypass | ✅ Acceptable — edge functions validate auth properly |
| Profiles PII access | ✅ Acceptable — sealed envelope model, staff-gated |
| Client-side admin checks | ✅ Acceptable — UI-only, server enforces real auth |
| ILIKE search patterns | ✅ Low risk — parameterized queries, debounced, limited |
| Store credentials exposure | ✅ Fixed — restricted to admin/lead_administrator |

---

### Implementation Plan

**Step 1: Migration — Fix discount codes RLS**
- Drop the overly broad `Authenticated users can validate discount codes` policy
- Create two replacement policies:
  - Store owners/team can SELECT their own store's codes
  - A new `validate_discount_code` RPC (SECURITY DEFINER) for customers to check a code without seeing all codes

**Step 2: Migration — Fix Realtime channel authorization**
- Add RLS policy on `realtime.messages` scoping subscription by `auth.uid()` and topic pattern

**Step 3: Migration — Restrict store_domains anonymous access**
- Create a security-definer view exposing only safe columns (`domain`, `store_id`, `is_primary`)
- Or replace the anonymous policy to use column-level restrictions

**Step 4: Update frontend**
- Replace direct `seller_discount_codes` queries in checkout with `supabase.rpc('validate_discount_code', { code, store_id })` call

---

### Files Changed

- **Migration**: Fix `seller_discount_codes` RLS + add `validate_discount_code` RPC
- **Migration**: Add `realtime.messages` RLS policies
- **Migration**: Restrict `store_domains` anonymous SELECT
- **Edit**: Checkout/discount components — use RPC instead of direct table query

### Risk

Low — all changes are additive policy restrictions. Existing admin/owner access patterns remain intact. The discount code RPC maintains the same UX (user enters code, gets validation result) while eliminating the exposure vector.

