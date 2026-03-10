

# Dispute System Improvements Plan

## Current State

The dispute system has three surfaces: a **DisputeDialog** (customer files), **SellerRefunds** (seller responds), and **Admin Disputes** (staff resolves). However, several critical flows are missing:

- Customers cannot view dispute status after filing
- Customers cannot escalate after seller denial
- No automatic escalation when sellers miss the 48h deadline
- No evidence attachments for either party

## What We Will Build

### 1. Customer Dispute Tracker (My Purchases page)

Add a dispute status indicator to each order card that has an active dispute. When clicked, opens a **DisputeStatusDialog** showing:

- Current status with visual badge (Pending, Denied, Escalated, Approved, Resolved)
- Timeline of events (filed, seller responded, escalated, resolved)
- Seller's response (if any)
- Admin's decision (if any)
- Escalation button (visible only when status = "denied")

**Data**: Query `refund_requests` where `customer_id = auth.uid()` for orders in the list.

### 2. Customer Escalation Flow

When a seller denies a dispute, the customer sees a prominent "Escalate to Eclipse" button. Clicking opens a form for an escalation reason. On submit:

- Updates `refund_requests` row: `status = 'escalated'`, `escalated_at = now()`, `escalation_reason = <input>`
- Sends a Discord notification via `send-ticket-notification` edge function
- Creates a seller notification for visibility

**RLS**: The existing customer UPDATE policy already allows `customer_id = auth.uid()`. We will add a database function `escalate_dispute` (SECURITY DEFINER) that validates the dispute is in "denied" status before allowing escalation, preventing status manipulation.

### 3. Auto-Escalation (48h Cron)

Create a new edge function `auto-escalate-disputes` that:

- Queries `refund_requests` where `status = 'pending'` and `created_at < now() - interval '48 hours'`
- Updates matching rows to `status = 'escalated'`, `escalated_at = now()`, `escalation_reason = 'Auto-escalated: seller did not respond within 48 hours'`
- Sends Discord notifications for each escalated dispute
- Scheduled via `pg_cron` to run every hour

### 4. Evidence Attachments

Create a private storage bucket `dispute-evidence` with RLS policies allowing:

- Customers to upload evidence for their own disputes
- Sellers to upload evidence for disputes on their store
- Staff to view all evidence

Add a `dispute_evidence` table:

```text
id (uuid PK)
dispute_id (uuid FK → refund_requests)
uploaded_by (uuid FK → auth.users via profiles)
file_path (text)
file_name (text)
file_size (integer)
created_at (timestamptz)
```

Integrate file upload into:
- The DisputeDialog (customer filing)
- The DisputeStatusDialog (customer adding evidence post-filing)
- The SellerRefunds response dialog
- The Admin Disputes detail dialog

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/purchases/DisputeStatusDialog.tsx` | **Create** — Customer dispute tracker + escalation UI |
| `src/pages/MyPurchases.tsx` | **Edit** — Fetch dispute status per order, show badge + open tracker |
| `src/components/purchases/DisputeDialog.tsx` | **Edit** — Add evidence upload field |
| `src/components/purchases/DisputeEvidenceUpload.tsx` | **Create** — Reusable evidence file upload component |
| `src/pages/seller/SellerRefunds.tsx` | **Edit** — Add evidence upload to seller response dialog, show customer evidence |
| `src/pages/admin/Disputes.tsx` | **Edit** — Show evidence attachments in detail dialog |
| `supabase/functions/auto-escalate-disputes/index.ts` | **Create** — Cron-triggered auto-escalation function |
| Migration SQL | **Create** — `dispute_evidence` table, `escalate_dispute` RPC, storage bucket, RLS policies |
| pg_cron SQL (insert tool) | **Run** — Schedule hourly cron job |

## Database Changes (Migration)

```sql
-- 1. dispute_evidence table
CREATE TABLE public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

-- RLS: customers see own, sellers see their store's, staff see all

-- 2. escalate_dispute RPC (SECURITY DEFINER)
-- Validates status = 'denied' before allowing escalation

-- 3. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('dispute-evidence', 'dispute-evidence', false);

-- 4. Storage RLS policies for upload/download
```

## Execution Order

1. Database migration (table + RPC + bucket + policies)
2. Auto-escalation edge function + cron schedule
3. `DisputeEvidenceUpload` component
4. `DisputeStatusDialog` component (tracker + escalation)
5. Update `MyPurchases` to show dispute status + open tracker
6. Update `DisputeDialog` with evidence upload
7. Update `SellerRefunds` with evidence viewing + upload
8. Update admin `Disputes` with evidence viewing

