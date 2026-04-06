

# Ticket & Support System — Enterprise Audit

## Current State (What's Already Strong)

Your ticketing system has solid enterprise foundations:
- Round-robin auto-assignment to on-duty staff
- 24-hour auto-escalation for unanswered tickets
- Realtime messaging with file attachments (10MB)
- Internal staff notes (yellow-highlighted, invisible to customers)
- Customer context sidebar (profile, orders, past tickets)
- SLA color indicators (green → red) on ticket lists
- Discord + push notifications on new tickets
- Guest support form for unauthenticated users
- Canned/quick-reply responses
- Claim ticket workflow with priority + status management

## Gaps to Close for Enterprise-Grade

### 1. Customer Satisfaction (CSAT) Surveys
**Missing entirely.** After a ticket is resolved, there's no feedback loop. Enterprise systems (Zendesk, Freshdesk) always collect a 1-5 star rating + optional comment.

**Plan:** Add a `ticket_satisfaction` table. When a ticket moves to "resolved", show the customer a rating prompt (1-5 stars + comment). Display average CSAT in the Staff Performance dashboard.

### 2. First Response Time & Resolution Time Tracking
**Missing.** There's no `first_response_at` or `resolved_at` column on tickets. The auto-escalation checks `last_staff_response_at` on seller tickets but customer tickets lack this entirely. Enterprise SLA reporting requires these timestamps.

**Plan:** Add `first_response_at` and `resolved_at` columns to `support_tickets`. Set them automatically via a trigger when the first staff message is sent and when status changes to resolved/closed. Surface these metrics in the ticket detail sidebar and Staff Performance dashboard.

### 3. Database-Driven Canned Responses
**Currently hardcoded** as a `const` array in both `CustomerTicketDetail.tsx` and `SellerTickets.tsx`. Staff can't add, edit, or share new responses without a code deploy.

**Plan:** Create a `canned_responses` table (title, body, category, created_by). Add a small management UI in admin settings. Replace the hardcoded arrays with a query.

### 4. Customer Email Notifications on Staff Reply
**Missing.** When staff replies to a ticket, the customer only sees it if they log in and check. Enterprise systems send an email: "A staff member has replied to your ticket."

**Plan:** Create a `send-ticket-reply-notification` edge function triggered after a staff message insert. Use the existing email template pattern to send a branded notification to the customer's email.

### 5. Agent Collision Detection
**Missing.** Two staff members can open the same ticket and reply simultaneously without knowing the other is active. Enterprise helpdesks show "Agent X is viewing/typing."

**Plan:** Use Supabase Realtime presence on the ticket channel. Show a small banner "Agent X is viewing this ticket" when another staff member has the detail page open.

### 6. Ticket Snooze
**Missing.** Staff can't temporarily hide a ticket and have it resurface later (e.g., "snooze for 24h" when waiting for an external process). They must manually remember to check back.

**Plan:** Add `snoozed_until` column to both ticket tables. Add a "Snooze" dropdown (1h, 4h, 24h, 3d). Snoozed tickets are filtered from the default list view and reappear automatically when the snooze expires.

### 7. Code Duplication
`CustomerTicketDetail.tsx` (811 lines) and `SellerTickets.tsx` (756 lines) duplicate most of the conversation UI, message rendering, attachment handling, and canned response logic. This is a maintenance burden and inconsistency risk.

**Plan:** Extract shared components: `TicketConversation`, `TicketReplyBox`, `TicketContextPanel`. Both pages import from the shared set.

## Priority Order

| # | Improvement | Impact | Effort |
|---|-------------|--------|--------|
| 1 | SLA timestamps (first response + resolution time) | High — enables all reporting | Small (migration + trigger) |
| 2 | Customer email on staff reply | High — customers miss replies today | Medium (edge function) |
| 3 | CSAT surveys | High — closes feedback loop | Medium (table + UI) |
| 4 | Database-driven canned responses | Medium — staff self-service | Small |
| 5 | Agent collision detection | Medium — prevents duplicate replies | Small (realtime presence) |
| 6 | Ticket snooze | Medium — workflow efficiency | Small |
| 7 | Shared conversation components | Low (DX) — reduces 1500+ lines of duplication | Medium |

## Files Affected

| Area | Files |
|------|-------|
| Database | New migration: `ticket_satisfaction`, `canned_responses`, columns on `support_tickets` |
| Edge functions | New: `send-ticket-reply-notification` |
| Admin UI | `CustomerTicketDetail.tsx`, `SellerTickets.tsx`, Staff Performance page |
| Customer UI | `SupportTicketDetail.tsx` (CSAT prompt) |
| Shared | New: `src/components/tickets/TicketConversation.tsx`, `TicketReplyBox.tsx` |

