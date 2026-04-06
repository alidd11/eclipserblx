
# Ticket System — Phase 2 Improvements

## What's Done (Phase 1)
✅ DB columns: `first_response_at`, `resolved_at`, `snoozed_until` on `support_tickets`  
✅ CSAT table + prompt on customer ticket detail  
✅ DB-driven canned responses (hook + fallbacks)  
✅ Agent collision detection on CustomerTicketDetail  
✅ Snooze functionality on CustomerTicketDetail  
✅ Triggers for auto-setting SLA timestamps  

## Remaining Gaps

### 1. Surface SLA Metrics in Ticket Detail Sidebar
**Problem:** `first_response_at` and `resolved_at` exist but are invisible to staff. They can't see response times.  
**Fix:** Show "First Response" and "Resolution Time" in the ticket detail sidebar on both customer and seller ticket pages.

### 2. Staff Performance Dashboard — CSAT + SLA Columns
**Problem:** The dashboard only shows counts (tickets resolved, chats completed). No quality metrics.  
**Fix:** Add average CSAT rating and average first-response time columns to the staff performance table. Create a DB view or query that joins `ticket_satisfaction` and SLA timestamps.

### 3. Agent Collision on Seller Tickets
**Problem:** `useAgentCollision` is only wired into `CustomerTicketDetail`, not `SellerTickets`. Two staff can clash on seller tickets.  
**Fix:** Wire the same hook into the seller ticket detail view.

### 4. Customer Email on Staff Reply
**Problem:** No edge function exists yet. When staff reply, customers only see it if they log in.  
**Fix:** Create `send-ticket-reply-notification` edge function. Trigger it from the staff reply mutation in `CustomerTicketDetail`.

### 5. Canned Response Management UI
**Problem:** DB table exists but no admin UI to add/edit/delete responses. Staff must ask a developer.  
**Fix:** Add a small management panel in admin settings for CRUD on `canned_responses`.

## Priority Order
| # | Item | Impact |
|---|------|--------|
| 1 | SLA metrics in ticket sidebar | High — staff see response times |
| 2 | Staff Performance CSAT + SLA | High — quality metrics |
| 3 | Agent collision on seller tickets | Medium — prevents duplicate work |
| 4 | Email on staff reply | High — customers get notified |
| 5 | Canned response management | Medium — staff self-service |

## Files Affected
| Area | Files |
|------|-------|
| Ticket detail | `CustomerTicketDetail.tsx`, `SellerTickets.tsx` |
| Staff dashboard | `StaffPerformance.tsx` |
| Edge functions | New: `send-ticket-reply-notification/index.ts` |
| Admin settings | New: `CannedResponseManager.tsx` |
| Database | Migration for staff perf view updates |
