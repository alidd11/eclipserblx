
# Automated Stripe-to-Wise Funding System

## Overview

This plan implements a **smart queue system** that automatically pulls funds from Stripe to Wise when the Wise balance is insufficient for seller bank transfer payouts.

## How It Will Work

When an admin clicks "Send via Wise" for a seller payout:

1. The system checks the Wise GBP balance
2. **If sufficient funds**: Proceeds with the transfer immediately (current behavior)
3. **If insufficient funds**:
   - Queues the payout with status `awaiting_funds`
   - Calculates the amount needed (payout amount + 10% buffer for fees)
   - Creates a Stripe payout to your Wise bank account
   - Stores tracking information for the funding request

A background job runs hourly to:
- Check if any payouts are waiting for funds
- Verify the Wise balance has been topped up
- Automatically process queued payouts when funds arrive

---

## Implementation Components

### 1. Database Schema Updates

Add new columns to track funding status:

**seller_payouts table:**
- `funding_status` - Tracks if awaiting Stripe funds (`null`, `funding_requested`, `funded`, `funding_failed`)
- `stripe_funding_payout_id` - Links to the Stripe payout used for funding
- `funding_requested_at` - When the funding was requested
- `wise_transfer_id` - Already exists for Wise tracking
- `wise_quote_id` - Already exists for quote tracking
- `completed_at` - When the transfer completed
- `failure_reason` - Details if the transfer failed

**New table: wise_funding_requests**
- Tracks Stripe-to-Wise fund transfers
- Stores amounts, statuses, and linked payout IDs
- Enables reconciliation and auditing

### 2. Enhanced Wise Payout Edge Function

Modify the existing `wise-payout` function to:

1. **Check Wise balance first** before attempting a transfer
2. **If balance is insufficient**:
   - Calculate required amount (payout + 10% buffer)
   - Create a Stripe payout to the Wise bank account
   - Mark payout as `awaiting_funds` with `funding_status: 'funding_requested'`
   - Return a user-friendly message explaining the delay
3. **If balance is sufficient**: Process as normal

### 3. New Scheduled Edge Function: `check-wise-funding`

A scheduled job that runs every hour to:

1. Query all payouts with `funding_status = 'funding_requested'`
2. Check current Wise GBP balance
3. For each payout where balance is now sufficient:
   - Create quote and transfer via Wise API
   - Fund the transfer from Wise balance
   - Update payout status to `processing`
   - Update funding_status to `funded`
4. Handle any transfers stuck too long (e.g., notify admin after 5 days)

### 4. Stripe Webhook Enhancement

Add handling for `payout.paid` events to:

1. Detect when a Stripe-to-Wise payout completes
2. Update the corresponding funding request record
3. Optionally trigger immediate processing of queued payouts

### 5. UI Updates

**Admin Seller Payouts page:**
- New status badge: "Awaiting Funds" (amber/orange)
- Show estimated arrival time (1-2 business days)
- Display funding details in the payout dialog
- Notification when funds arrive and payouts auto-process

---

## Prerequisites

Before implementation, you'll need to configure your Wise bank account as an external account in Stripe:

1. Go to your Stripe Dashboard → Balance → External Accounts
2. Add a new bank account with your Wise GBP account details:
   - Sort Code (from Wise GBP account)
   - Account Number (from Wise GBP account)
3. This allows Stripe to send funds directly to your Wise balance

---

## Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     PAYOUT REQUEST FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Admin clicks "Send via Wise"                                       │
│              │                                                      │
│              ▼                                                      │
│  ┌───────────────────────────────┐                                  │
│  │ Check Wise GBP Balance        │                                  │
│  └───────────────┬───────────────┘                                  │
│                  │                                                  │
│        ┌─────────┴─────────┐                                        │
│        │                   │                                        │
│        ▼                   ▼                                        │
│   Sufficient          Insufficient                                  │
│        │                   │                                        │
│        ▼                   ▼                                        │
│   Process Now      ┌───────────────────────────┐                    │
│   via Wise         │ Calculate funding needed  │                    │
│        │           │ (payout + 10% buffer)     │                    │
│        │           └───────────────┬───────────┘                    │
│        │                           │                                │
│        │                           ▼                                │
│        │           ┌───────────────────────────┐                    │
│        │           │ Create Stripe Payout to   │                    │
│        │           │ Wise Bank Account         │                    │
│        │           └───────────────┬───────────┘                    │
│        │                           │                                │
│        │                           ▼                                │
│        │           ┌───────────────────────────┐                    │
│        │           │ Status: awaiting_funds    │                    │
│        │           │ (Funds arrive 1-2 days)   │                    │
│        │           └───────────────────────────┘                    │
│        │                           │                                │
│        │                           ▼                                │
│        │           ┌───────────────────────────┐                    │
│        │           │ Hourly Job: Check balance │                    │
│        │           │ & auto-process when ready │                    │
│        │           └───────────────────────────┘                    │
│        │                           │                                │
│        └───────────┬───────────────┘                                │
│                    │                                                │
│                    ▼                                                │
│  ┌───────────────────────────────┐                                  │
│  │ Wise webhook updates status   │                                  │
│  │ to 'completed' when paid      │                                  │
│  └───────────────────────────────┘                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### Database Migration

```sql
-- Add funding tracking columns to seller_payouts
ALTER TABLE seller_payouts
ADD COLUMN IF NOT EXISTS funding_status TEXT,
ADD COLUMN IF NOT EXISTS stripe_funding_payout_id TEXT,
ADD COLUMN IF NOT EXISTS funding_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS wise_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS wise_quote_id TEXT;

-- Add constraint for valid funding statuses
ALTER TABLE seller_payouts
ADD CONSTRAINT valid_funding_status 
CHECK (funding_status IN ('funding_requested', 'funded', 'funding_failed') OR funding_status IS NULL);

-- Create funding requests tracking table
CREATE TABLE wise_funding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payout_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  linked_payout_ids UUID[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE wise_funding_requests ENABLE ROW LEVEL SECURITY;

-- Only staff can access funding requests
CREATE POLICY "Staff can manage funding requests"
ON wise_funding_requests FOR ALL
TO authenticated
USING (is_staff(auth.uid()));
```

### Edge Function: Enhanced wise-payout

Key changes to `process-seller-payout` action:
- Check balance before attempting transfer
- If insufficient, create Stripe payout and queue
- Return appropriate status for UI feedback

### Edge Function: check-wise-funding (New)

Scheduled to run hourly via pg_cron:
- Query payouts with `funding_status = 'funding_requested'`
- Check Wise balance
- Process eligible payouts
- Log all operations for audit

### Edge Function: stripe-webhook Enhancement

Add handling for `payout.paid` event type:
- Update funding request status
- Trigger balance check for queued payouts

### UI Component Updates

SellerPayouts.tsx changes:
- Add "Awaiting Funds" badge (amber styling)
- Show funding details in dialog
- Display estimated fund arrival time
- Add "processing" filter option

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database | Migration | Add columns and new table |
| `supabase/functions/wise-payout/index.ts` | Modify | Add balance check and Stripe funding logic |
| `supabase/functions/check-wise-funding/index.ts` | Create | Scheduled job to process queued payouts |
| `supabase/functions/stripe-webhook/index.ts` | Modify | Handle `payout.paid` events |
| `supabase/config.toml` | Modify | Add new edge function config |
| `src/pages/admin/SellerPayouts.tsx` | Modify | Add awaiting_funds status and UI |

---

## Estimated Timing

- **Stripe payout to bank**: 1-2 business days
- **Funds appear in Wise**: Same day or next business day after Stripe payout lands
- **Total delay for seller**: 2-3 business days when funding is needed

Sellers will be notified their payout is "processing" and the system handles everything automatically once funds arrive.
