

## Issues Identified from User Reports

### Issue 1: `column "payout_method" of relation "seller_payouts" does not exist`
**Root cause**: The recent migration (`20260324174736`) updated the `request_seller_payout` RPC function to insert `payout_method` and `paypal_email` columns into `seller_payouts`, but those columns were never added to the table. The table only has the original columns (no `payout_method`, no `paypal_email`).

### Issue 2: Scrolling not working on phone
Needs further investigation but is likely a separate UI issue. Will focus on the critical payout bug first.

---

## Plan

### Step 1: Add missing columns to `seller_payouts` table
Create a database migration to add the two missing columns:
- `payout_method TEXT DEFAULT 'stripe'` -- stores which method was selected at request time
- `paypal_email TEXT` -- stores the PayPal email if method is paypal

This will immediately fix the `request_seller_payout` RPC function that already references these columns.

### Step 2: Backfill existing records
In the same migration, backfill any existing `seller_payouts` records by looking up the `payout_method` from `store_payment_details` for their respective `store_id`.

---

### Technical Details
- Single SQL migration adding two nullable columns with defaults
- No code changes needed -- the RPC function and frontend code are already correct
- The `auto-process-seller-payouts` edge function already handles `bank_transfer`/`bank`/`paypal` routing, so having this column populated will improve payout accuracy

