

# Fix Auto-Payout Function + PayPal Auth Test

## Problem Found
The `auto-process-seller-payouts` function is **currently broken** for ALL payout methods. The query on line 117 selects `wise_recipient_id` from the `stores` table, but that column doesn't exist — it crashes the entire function before it can process any payouts (Stripe, Wise, or PayPal).

## Fix Required

**File:** `supabase/functions/auto-process-seller-payouts/index.ts`

1. **Remove `wise_recipient_id` from the stores select** (line 117) — this column doesn't exist on `stores`
2. **For Wise payouts**, look up bank details from `store_payment_details` instead (which has `bank_account_number`, `bank_routing_number`, `bank_swift_bic`, `bank_country`, etc.) — or create the Wise recipient on-the-fly from those details
3. The PayPal and Stripe paths already correctly use `store_payment_details`, so they just need the query fix to stop crashing

## PayPal Testing
- I can verify the **PayPal OAuth token** works by invoking the function after the fix (it will authenticate even without Payouts API access)
- Actual PayPal payouts will still fail until PayPal enables the feature on your Live account — but at least we'll confirm credentials are valid
- Stripe and Wise payouts will start working again immediately after this fix

## Changes
- Fix the stores query to remove the non-existent `wise_recipient_id` column
- Update the Wise bank transfer section to fetch recipient info from `store_payment_details` instead

