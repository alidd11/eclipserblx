

## Investigation Report: "Can't Access Orders or Support"

### Root Cause Analysis

I traced the entire payment-to-order pipeline and found **three concrete failure points** that cause customers to lose access to their purchases and support:

---

### Finding 1: Orphaned Orders (Critical)

**4 out of 43 paid orders** have `user_id = NULL` **and** empty `customer_email`. These orders are invisible to the customer because:

- RLS policy on `orders` requires `auth.uid() = user_id` — NULL user_id means no match
- The email fallback in MyPurchases (`.eq('customer_email', user.email).is('user_id', null)`) also fails because `customer_email` is blank

**How it happens**: In `create-payment-intent`, line 60 calls `authenticateUser()`. If the JWT is expired/corrupt (which your auth system already guards against, but edge cases exist), `userId` comes back null. Line 63 allows checkout to proceed without auth (`type !== 'checkout'`). The metadata stores `user_id: ""`. When `verify-payment` or `webhook-payment-handler` processes this, they try a profile email lookup as fallback (line 78-82), but if that also fails (no profile row, email mismatch), both `user_id` and `customer_email` end up null/empty.

**Impact**: Customer pays, gets a success page, but the order never appears in "My Purchases."

### Finding 2: No Order Recovery Path

There is **no self-service mechanism** for a customer to reclaim an orphaned order. The only option is contacting support via Discord — which is exactly the screenshot complaint.

### Finding 3: Support Ticket RLS Gap

The support ticket INSERT policy requires `auth.uid() = user_id`. This is correct. But if a customer is experiencing auth issues (session expired, corrupt JWT), they cannot even create a support ticket to report their problem. There is no unauthenticated fallback.

---

### Enterprise Fix Plan

#### Step 1: Order Reconciliation Trigger (Database)
Create a database trigger that runs on every `orders` INSERT. If `user_id` is NULL but `customer_email` is not empty, auto-resolve the user from the `profiles` table and set `user_id`. This prevents future orphans from the webhook path.

#### Step 2: Backfill Existing Orphaned Orders (Migration)
Run a one-time migration to match the 4 orphaned orders to users via Stripe payment data (payment_id lookup).

#### Step 3: Post-Purchase Health Check (Frontend)
After `OrderSuccess` renders, add a silent verification query that checks whether the order actually exists and is linked to `auth.uid()`. If not, call a new edge function `claim-order` that:
- Takes the `payment_id` from the URL/session
- Verifies the Stripe payment belongs to the authenticated user (by email match)
- Updates `user_id` on the order

#### Step 4: Order Recovery Page (Frontend)
Add a `/recover-order` page accessible from the Support page where customers can enter their payment email. The system queries Stripe for payments matching that email, cross-references with orphaned orders, and links them to the authenticated user.

#### Step 5: Guest Support Fallback (Frontend + Edge Function)
Add an unauthenticated contact form on the Support page that creates a `support_tickets` row via a new `guest-support-ticket` edge function (using service role), requiring only email + message. This ensures customers can always reach support even during auth failures.

### Files Changed
- **Migration**: Reconciliation trigger + backfill orphaned orders
- `supabase/functions/claim-order/index.ts` — New edge function for post-purchase self-healing
- `supabase/functions/guest-support-ticket/index.ts` — New edge function for unauthenticated support
- `src/pages/OrderSuccess.tsx` — Add silent order health check
- `src/pages/Support.tsx` — Add guest contact form and order recovery link
- `src/pages/RecoverOrder.tsx` — New self-service order recovery page
- `src/App.tsx` — Add route for `/recover-order`

