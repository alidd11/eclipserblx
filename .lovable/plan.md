

## Analysis

The **Reject button already exists** in the SellerPayouts page (inside the "Process Payout" dialog). However, when a payout is rejected, the current code only updates the payout status to "rejected" — it does **not** return the funds to the seller's `available_balance` in `seller_balances`.

This is the bug: sellers lose their balance when a payout is rejected because the funds were already deducted when the payout was requested, but never restored on rejection.

## Plan

**File: `src/pages/admin/SellerPayouts.tsx`**

Modify the `processMutation` handler (around lines 68-103) to add balance restoration logic when `status === "rejected"`:

- After updating the payout status to "rejected", fetch the seller's current `seller_balances` record
- Add the payout `amount` back to `available_balance`
- This mirrors the existing "completed" branch but restores funds instead of deducting them

The change is ~10 lines inside the existing `mutationFn`, adding an `else if (status === "rejected" && payout)` block that:
1. Fetches `available_balance` from `seller_balances` for the seller
2. Updates `available_balance += payout.amount`

No new UI elements needed — the reject button and dialog already exist and work correctly. This is purely a backend-logic fix on the client mutation.

