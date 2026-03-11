

## Fix Bourny's Payout & Harden Auto-Payout Routing

### The Problem

Bourny's Productions (STR-2218B3) has a pending £5.42 payout that's been stuck since March 9th because:
- Store `payout_method` = `stripe`, but no Stripe Connect account is connected
- PayPal email IS configured: `Harleyjaeb@gmail.com`
- The auto-payout system skips it every run with `no_stripe_account`

### Fix 1: Data Correction (Immediate)

Update Bourny's store `payout_method` from `stripe` to `paypal` so the next auto-payout run processes it correctly.

### Fix 2: Code — Smart Fallback Logic (Preventive)

Update `auto-process-seller-payouts/index.ts` to add **fallback routing** when the configured method can't work:

```text
Current flow:
  payout_method = 'stripe' → no stripe_account → SKIP ❌

New flow:
  payout_method = 'stripe' → no stripe_account → check PayPal email → USE PAYPAL ✅
  payout_method = 'paypal' → no PayPal email → check Stripe account → USE STRIPE ✅
  Neither available → SKIP (with clear failure reason)
```

Specifically in the edge function:
1. After determining `payoutMethod` from the store, add a validation block
2. If the preferred method lacks credentials, check if an alternative method has valid credentials
3. If fallback used, log it and include in the payout notes so admins can see the override
4. Also auto-correct the store's `payout_method` to match reality, preventing repeated fallbacks

### Fix 3: Seller Dashboard — Payout Method Validation

In the seller settings where they choose their payout method, add validation that prevents selecting "Stripe" without a connected Stripe account, and prevents selecting "PayPal" without a PayPal email configured.

### Files Changed

- **Data update**: `stores` table — set `payout_method = 'paypal'` for Bourny's store
- **Edge function**: `supabase/functions/auto-process-seller-payouts/index.ts` — add fallback routing logic (~30 lines)
- **Seller settings**: Find and update the payout method selector component to add validation

