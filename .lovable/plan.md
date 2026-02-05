

# Support System Overhaul: Human-First Ticket System

## Overview
Transform the support infrastructure to a **ticket-based system with human support as the primary focus**. AI will assist but not lead. The existing live chat remains as a real-time option, while community forums will be removed to simplify the support experience.

---

## Key Principle: Human-First Support

The ticket system will prioritize **human response** over AI automation:
- Staff receive instant notifications for new tickets
- AI assists by suggesting responses (not auto-responding)
- Human agents are the primary responders
- AI handles FAQ suggestions and context gathering only

---

## Current State

### Existing Infrastructure
1. **Live Chat** - AI-first chat with human escalation (`ChatSidePanel.tsx`, `ChatWidget.tsx`)
2. **Forum System** - Full community forums (`Forum.tsx`, `ThreadDetail.tsx`, `GeneralChatChannel.tsx`)
3. **Seller Ticket System** - Dedicated seller-only support (`SellerSupport.tsx`, `seller_support_tickets`)
4. **Customer Tickets** - Existing tables: `support_tickets`, `ticket_messages` (partially used in `ChatHistory.tsx`)
5. **Support Hub** - Help center page (`Support.tsx`)

### Database Tables
**To Remove:**
- `forum_categories`, `forum_threads`, `forum_posts`
- `forum_chat_messages`, `forum_chat_reactions`, `forum_reports`

**To Keep/Enhance:**
- `support_tickets`, `ticket_messages` (customer tickets)
- `chat_conversations`, `chat_messages` (live chat)
- `seller_support_tickets` (seller-specific)

---

## Implementation Plan

### Phase 1: Customer Ticket System UI

**New Customer Pages:**
- `src/pages/SupportTickets.tsx` - List customer's tickets with status indicators
- `src/pages/SupportTicketDetail.tsx` - View ticket conversation, send replies

**New Components:**
- `src/components/support/CreateTicketDialog.tsx` - Submit new ticket form
- `src/components/support/TicketCard.tsx` - Reusable ticket list card

**Features:**
- Ticket categories: Order Issue, Product Question, Technical, Billing, Refund, Other
- Priority levels: normal, high
- Status tracking: open → in_progress → awaiting_customer → resolved → closed
- Real-time message updates via Supabase subscriptions
- Ticket ID format: TKT-XXXXXX (auto-generated)

### Phase 2: Admin Ticket Management

**New Admin Page:**
- `src/pages/admin/CustomerTickets.tsx` - Manage all customer support tickets

**Features:**
- Priority queue with newest/urgent tickets at top
- One-click claim ticket (assigns to staff member)
- Threaded messaging with internal notes
- Status management workflow
- Staff gets push notifications for new tickets
- Filter by status, priority, category
- Integration with existing Transcripts page for closed tickets

### Phase 3: Update Support Hub

**Modify `src/pages/Support.tsx`:**
- Replace forum links with ticket system access
- Prominent "Submit a Ticket" button
- Show user's active ticket count
- Quick access to ticket history
- Keep FAQ and Live Chat as secondary options

**Updated Quick Links:**
1. Submit a Ticket (primary action)
2. View My Tickets (history)
3. Browse FAQ (self-service)
4. Live Chat (urgent/real-time)

### Phase 4: Update Chat Widget

**Modify `src/components/chat/ChatWidget.tsx`:**
- Replace Forum link with "Submit Ticket" option
- Update info panel to show ticket submission
- Keep live chat as primary real-time action

**Current:**
```
FAQ | Forum
```

**Updated:**
```
FAQ | Submit Ticket
```

### Phase 5: Remove Forum System

**Files to Delete:**
1. `src/pages/Forum.tsx`
2. `src/pages/ThreadDetail.tsx`
3. `src/components/forum/CreateThreadDialog.tsx`
4. `src/components/forum/GeneralChatChannel.tsx`
5. `src/components/home/ForumShowcase.tsx`
6. `src/pages/admin/ForumReports.tsx`

**Files to Modify:**
1. `src/components/layout/Header.tsx` - Remove forum nav item
2. `src/components/layout/CustomerSidebar.tsx` - Remove forum link
3. `src/components/layout/MainLayout.tsx` - Remove forum keyboard handling
4. `src/components/layout/UniversalBreadcrumb.tsx` - Remove forum breadcrumb
5. `src/components/admin/AdminSidebar.tsx` - Remove Forum Reports
6. `src/App.tsx` - Remove forum routes
7. `src/pages/NotificationPreferences.tsx` - Remove forum toggle (or repurpose)

**Database Migration:**
- Soft-delete forum tables (preserve data temporarily)
- Remove forum RLS policies

### Phase 6: Navigation Updates

**AdminSidebar.tsx Updates:**
- Add "Customer Tickets" under Support section
- Remove "Forum Reports"

**CustomerSidebar.tsx Updates:**
- Replace "Forum" with "My Tickets"
- Add "Submit Ticket" quick action

---

## Technical Details

### Support Flow (Human-First)

```text
Customer submits ticket
        ↓
Staff notified (push + in-app)
        ↓
Staff claims & responds
        ↓
Customer receives notification
        ↓
Conversation continues
        ↓
Staff resolves ticket
```

### Database Schema (Existing)

The `support_tickets` table already exists with:
- id, subject, status, priority
- user_id, assigned_to
- customer_email
- created_at, updated_at

The `ticket_messages` table already exists with:
- id, ticket_id, sender_id
- sender_type, message
- is_internal_note
- created_at

### RLS Policy Updates

Add policies for customer ticket access:
- Customers can read/insert their own tickets
- Customers can read messages on their tickets
- Staff can read all tickets
- Staff can update ticket status and send replies

### Real-time Notifications

Extend `useSupportTicketNotifications.ts`:
- Already listens for new `support_tickets`
- Add listener for new `ticket_messages` (staff replies)
- Notify customers when staff responds

---

## Files Summary

### New Files (5)
1. `src/pages/SupportTickets.tsx`
2. `src/pages/SupportTicketDetail.tsx`
3. `src/pages/admin/CustomerTickets.tsx`
4. `src/components/support/CreateTicketDialog.tsx`
5. `src/components/support/TicketCard.tsx`

### Files to Modify (10)
1. `src/pages/Support.tsx` - Redesign hub
2. `src/components/chat/ChatWidget.tsx` - Replace forum with ticket
3. `src/components/layout/Header.tsx` - Remove forum nav
4. `src/components/layout/CustomerSidebar.tsx` - Update links
5. `src/components/layout/MainLayout.tsx` - Remove forum handling
6. `src/components/admin/AdminSidebar.tsx` - Add Customer Tickets, remove Forum Reports
7. `src/App.tsx` - Update routes
8. `src/hooks/useSupportTicketNotifications.ts` - Add customer notifications
9. `src/pages/NotificationPreferences.tsx` - Update forum toggle
10. `src/components/layout/UniversalBreadcrumb.tsx` - Update paths

### Files to Delete (6)
1. `src/pages/Forum.tsx`
2. `src/pages/ThreadDetail.tsx`
3. `src/components/forum/CreateThreadDialog.tsx`
4. `src/components/forum/GeneralChatChannel.tsx`
5. `src/components/home/ForumShowcase.tsx`
6. `src/pages/admin/ForumReports.tsx`

### Database Migration
1. Add customer ticket RLS policies
2. Soft-delete forum tables

---

## User Experience Summary

**Before:**
- Forums for community discussion
- Live chat with AI + human
- Separate seller ticket system
- Customer tickets partially implemented

**After:**
- **Ticket System** (Primary) - Human-first support with staff notifications
- **Live Chat** (Secondary) - Kept for urgent real-time issues
- **FAQ** (Self-Service) - Enhanced visibility
- **No Forums** - Simplified support experience

---

## Benefits

1. **Human-Centered** - Staff are primary responders, not AI
2. **Better Tracking** - All issues tracked with ticket IDs
3. **Clear History** - Customers can view all past tickets
4. **Staff Efficiency** - Centralized ticket management
5. **Simpler UX** - One clear path for support
6. **Maintainability** - Less code without forum system

