## Enterprise-Level Ticket System Overhaul

After auditing all ticket-related pages (seller support, customer tickets, admin seller tickets, admin customer tickets, customer ticket detail), here's a comprehensive enterprise upgrade plan.

---

### A. Seller Support Page (`SellerSupport.tsx`) — Already Flattened

This was just flattened in the previous iteration. Remaining improvements:

1. **Add ticket age indicator** — Show a subtle "2d old" or "5h ago" tag inline with each ticket, with visual urgency coloring (red if >48h without response)
2. **Add search** — Simple search input to filter tickets by subject
3. **Empty ticket detail** — Add "Select a ticket" placeholder when no ticket is selected on desktop
4. **Realtime** — Subscribe to `seller_support_tickets` and `seller_ticket_messages` for auto-refresh (currently missing on seller side)

---

### B. Admin Seller Tickets (`SellerTickets.tsx`) — Enterprise Flatten

**Problems:**
- Stats use `AdminStatCard` components (Card-wrapped) — heavy for simple counts
- Ticket list uses `Card > CardContent` per item — heavy
- Ticket detail uses a `Drawer` with `Card` wrappers for original message and resolution
- Empty state uses `Card > CardContent`

**Changes:**
1. **Flatten stats** — Replace `AdminStatCard` components with inline text stats row (matching seller products pattern)
2. **Flatten ticket list** — Replace `Card > CardContent` per ticket with `div.border-b.border-border.py-3` items
3. **Flatten ticket detail** — Replace `Card.bg-muted/50` for original message with `border-l-2 border-border pl-3` blockquote. Same for resolution notes.
4. **Flatten empty state** — Plain centered div, no Card wrapper
5. **Add search** — Filter tickets by subject or ticket number

---

### C. Admin Customer Tickets (`CustomerTickets.tsx`) — Enterprise Flatten

**Problems:**
- Ticket list uses `Card > CardContent` per item
- Uses `Card > CardHeader` for the overall list wrapper

**Changes:**
1. **Flatten ticket list** — Replace `Card` per ticket with borderless list items
2. **Remove Card list wrapper** — Use `border border-border rounded-xl` container instead
3. **Flatten stats** — Replace any Card-based counts with inline text

---

### D. Customer Ticket Detail (`CustomerTicketDetail.tsx`) — Enterprise Polish

**Problems:**
- Original message and resolution use `Card` wrappers
- Context sidebar uses multiple `Card` blocks

**Changes:**
1. **Flatten original message** — `border-l-2` blockquote pattern
2. **Flatten resolution** — Green `border-l-2` pattern
3. **Flatten context sidebar** — Replace Card wrappers with plain `border-b border-border` sections

---

### E. Escalation System — Formalize

**Current state:** `escalated_at` column exists but escalation is passive (no trigger, just visual). There's no automated escalation mechanism.

**New additions:**

1. **Database trigger for auto-escalation** — Create a database function that runs periodically (or on ticket update) to set `escalated_at = now()` on tickets that are `open` or `in_progress` and haven't had a staff response in 24 hours (`last_staff_response_at` is null or >24h ago, AND `created_at` is >24h ago)

2. **Auto-update `last_staff_response_at`** — Create a trigger on `seller_ticket_messages` and `ticket_messages` that updates the parent ticket's `last_staff_response_at` when an admin message is inserted

3. **Escalation badge on seller side** — Show sellers a "Priority response incoming" indicator when their ticket has been escalated, giving them confidence

4. **SLA timer display** — On admin ticket detail, show time elapsed since creation and time since last staff response, with color coding (green <4h, yellow 4-12h, orange 12-24h, red >24h)

5. **Scheduled cron job** — Use `pg_cron` + `pg_net` to invoke an edge function every 15 minutes that auto-escalates stale tickets

---

### Technical Details

**Database migration:**
- Add `last_staff_response_at` column to `support_tickets` (customer tickets — already exists on `seller_support_tickets`)
- Create trigger function `update_ticket_last_staff_response()` on both message tables
- Create function `auto_escalate_stale_tickets()` for the escalation logic
- Create `pg_cron` schedule to run escalation every 15 minutes

**Files modified:**
- `src/pages/seller/SellerSupport.tsx` — Add realtime, search, ticket age indicator
- `src/pages/admin/SellerTickets.tsx` — Flatten stats/list/detail, add search, SLA timer
- `src/pages/admin/CustomerTickets.tsx` — Flatten list/stats
- `src/pages/admin/CustomerTicketDetail.tsx` — Flatten original message/resolution/context
- New edge function: `supabase/functions/auto-escalate-tickets/index.ts`
