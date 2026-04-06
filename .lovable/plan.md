

## Seller Pro Billing Grace Period

### Problem

Current code in `useSellerSubscription.ts` only grants Pro when `status === 'active'`. The moment Stripe marks a subscription `past_due` (first failed retry), the seller loses all Pro features — themes, analytics, unlimited listings. This is hostile UX and not how enterprise platforms operate.

### Solution

Implement a 7-day grace period where sellers keep Pro features during `past_due` status, with escalating warnings.

### How It Works

```text
Payment fails → Stripe retries (3x over ~7 days)
                 ↓
           status = "past_due"
                 ↓
     Grace period starts (7 days)
     Seller keeps Pro + sees warning banner
                 ↓
     Day 7: features downgraded to Free
     Subscription canceled via Stripe API
```

### Changes

**1. Frontend — `useSellerSubscription.ts`**
- Treat `past_due` as Pro-with-warning (not immediate downgrade)
- Add `isGracePeriod` boolean and `gracePeriodEndsAt` date to returned state
- Calculate grace end = subscription's `current_period_end` + 7 days
- `isPro` stays `true` during grace; `isGracePeriod` signals the UI to show warnings

**2. Database — `seller_subscriptions` table**
- Add `grace_period_end` (TIMESTAMPTZ, nullable) column — set when status transitions to `past_due`

**3. Webhook handling — `stripe-subscription-webhook`**
- On `invoice.payment_failed`: set `grace_period_end` = now + 7 days, status = `past_due`
- On `invoice.paid` (successful retry): clear `grace_period_end`, status = `active`
- On `customer.subscription.deleted`: status = `canceled`

**4. Grace period enforcement — `expire-subscriptions` edge function**
- Add a check: any `seller_subscriptions` with `status = 'past_due'` AND `grace_period_end < now()` → update to `canceled`

**5. UI warning banner — Seller dashboard layout**
- When `isGracePeriod === true`, show a persistent amber banner: "Your payment failed. Update your payment method within X days to keep Pro features."
- Link to `openPortal()` for payment update
- Show countdown of remaining grace days

### Files Changed

- **Migration**: Add `grace_period_end` to `seller_subscriptions`
- **Edit**: `src/hooks/useSellerSubscription.ts` — grace period logic
- **Edit**: `supabase/functions/stripe-subscription-webhook/index.ts` — handle `past_due` transitions
- **Edit**: `supabase/functions/expire-subscriptions/index.ts` — enforce grace expiry
- **New**: Grace period warning banner component in seller layout

### Risk

Low — additive. Current `active` check still works; we're extending it to also accept `past_due` within the grace window. Stripe's own retry schedule aligns with the 7-day window.

