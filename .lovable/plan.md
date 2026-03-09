

## Plan: Automate Seller Withdrawal Payments

### Current State
- Sellers click "Request Payout" → creates a `seller_payouts` record with status `pending`
- Admin manually opens `/admin/seller-payouts`, reviews each request, and clicks "Process" 
- For Stripe Connect sellers: admin manually marks as completed and updates balances client-side
- For Wise (bank transfer) sellers: admin clicks "Process via Wise" which calls the `wise-payout` edge function
- `check-wise-funding` cron already runs hourly for `awaiting_funds` payouts

### What We'll Build
A new **`auto-process-seller-payouts`** edge function that runs on a scheduled cron job (every 30 minutes) and automatically processes pending payout requests without admin intervention.

### How It Works

1. **New edge function: `auto-process-seller-payouts`**
   - Fetches all `seller_payouts` with status `pending`
   - For each payout, looks up the store's `payout_method` from `store_payment_details`
   - **Stripe Connect sellers** (`payout_method = 'stripe'`): Creates a Stripe Transfer to the seller's connected account using `stripe.transfers.create({ destination: stripe_account_id })`. Marks payout as `completed`.
   - **Wise/bank transfer sellers** (`payout_method = 'bank_transfer'`): Calls the existing Wise payout logic (quote → transfer → fund). If insufficient Wise balance, triggers Stripe funding and marks as `awaiting_funds` (existing `check-wise-funding` cron handles retry).
   - **PayPal sellers** (`payout_method = 'paypal'`): Skips — keeps as `pending` for manual processing (PayPal requires manual handling).
   - Updates `seller_balances` atomically (deduct `available_balance`, increment `total_paid`)
   - Creates audit log entries for every processed payout
   - Sends seller notification on success/failure

2. **Safety guards**
   - Only processes payouts that have been pending for at least 5 minutes (prevents race with the seller's request)
   - Validates store has completed Stripe Connect onboarding (`payouts_enabled = true`) before attempting Stripe transfers
   - Validates Wise recipient exists before attempting bank transfers
   - Max 50 payouts per run to prevent timeout
   - Skips stores with `is_restricted = true` in security scores
   - All financial operations wrapped in try/catch per-payout (one failure doesn't block others)

3. **Cron job**: Schedule every 30 minutes via `pg_cron`

4. **Admin visibility**: Add an "Auto-processed" badge to the SellerPayouts admin page so staff can see which payouts were automated vs manual

### Files Changed
- **New**: `supabase/functions/auto-process-seller-payouts/index.ts`
- **Modified**: `src/pages/admin/SellerPayouts.tsx` — add auto-processed indicator badge
- **Database**: New cron job entry (via SQL insert, not migration)

### Technical Details

```text
Seller requests payout
        │
        ▼
  seller_payouts (status: pending)
        │
        ▼  (every 30 min cron)
  auto-process-seller-payouts
        │
   ┌────┴────────┬──────────────┐
   ▼             ▼              ▼
 Stripe      Wise/Bank       PayPal
 Connect     Transfer        (skip)
   │             │
   ▼             ▼
 Transfer    Quote→Transfer
 to acct     →Fund from bal
   │             │
   ▼             ▼
 completed   processing/
             awaiting_funds
```

