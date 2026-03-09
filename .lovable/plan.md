

# Add PayPal Balance Check + Stripe Funding Flow

## Problem
Currently, PayPal payouts fire immediately without checking if the PayPal account has sufficient funds. Since PayPal and Stripe use separate bank accounts, there's no automatic way to move money between them. We need the same safety net that Wise has: check balance first, trigger Stripe→bank funding if low, then retry once funds arrive.

## Flow (mirrors existing Wise pattern)

```text
PayPal payout requested
       │
       ▼
Check PayPal GBP balance via API
       │
       ├── Sufficient → Send payout immediately
       │
       └── Insufficient → Trigger Stripe payout to bank
                          Mark payout as "awaiting_funds"
                          │
                          ▼
              check-paypal-funding (cron, every 30 min)
                          │
                          ├── PayPal balance now sufficient → Process payout
                          └── Still waiting → Skip (retry next run)
                          └── 5+ days stuck → Mark as failed
```

## Changes

### 1. Update `auto-process-seller-payouts/index.ts` (PayPal section, lines 496-575)
- Before sending a PayPal payout, call the PayPal API to check the account's GBP balance
- If balance is insufficient, trigger a Stripe payout to the platform's bank (same logic as the Wise funding path on lines 290-370)
- Mark the payout as `awaiting_funds` with `funding_status: 'funding_requested'`
- Only send the PayPal payout if balance is sufficient

### 2. Create `check-paypal-funding/index.ts` (new edge function)
- Mirrors `check-wise-funding` but for PayPal
- Fetches all payouts with `status = 'awaiting_funds'` and `payout_method = 'paypal'`
- Checks PayPal balance via `/v1/reporting/balances` API
- If funds are available, sends the PayPal payout and updates status
- If stuck 5+ days, marks as failed
- Same auth guard pattern as `check-wise-funding`

### 3. Update `check-wise-funding/index.ts`
- Fix the existing TODO on line 161 — replace the hardcoded `recipientId = null` with on-the-fly recipient creation (same pattern already working in `auto-process-seller-payouts` lines 380-407)

### 4. Add cron schedule for `check-paypal-funding`
- Database migration to add a `pg_cron` job running every 30 minutes (same cadence as the Wise check)

### PayPal Balance API
Uses `GET /v1/reporting/balances?currency_code=GBP&as_of_time=NOW` with the existing PayPal credentials to check available funds before attempting a payout.

