

## Fix Ticket Detail Headers on Mobile

The screenshot shows the admin `CustomerTicketDetail` header is cluttered on mobile -- badges, two Select dropdowns (Priority + Status), and a context toggle button all sit in a cramped row, causing wrapping and visual noise.

The same pattern affects the `SellerTickets` drawer header and the customer-facing `SupportTicketDetail` header.

### Changes

**1. `src/pages/admin/CustomerTicketDetail.tsx` -- Restructure mobile header (lines 394-454)**
- Move the ticket subject (`h1`) up directly after the back button for immediate context
- Stack badges on one row, controls on a separate row below
- Make the Priority and Status selects full-width on mobile (`w-full sm:w-auto`) so they don't squeeze together
- Reduce `min-w` on select triggers for mobile (`min-w-[90px]` instead of `110px`/`140px`)
- Layout: Back button -> Title -> Badges row -> Controls row (claim, priority, status, context toggle)

**2. `src/pages/admin/SellerTickets.tsx` -- Tighten drawer header (lines 472-496)**
- Same pattern: stack badges and controls vertically instead of trying to fit everything in one `flex-wrap` row
- Reduce select trigger widths for the compact drawer

**3. `src/pages/SupportTicketDetail.tsx` -- Minor cleanup (lines 228-246)**
- Already cleaner but ensure badges don't overflow on very narrow screens by adding `flex-wrap` consistently

### Result
On mobile, each ticket detail header will have a clear visual hierarchy: back button, title, status badges, then action controls -- each on its own row with proper spacing rather than wrapping chaotically.

