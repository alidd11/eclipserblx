
-- Remove duplicate INSERT policy on support_tickets (keep "Customers can create their own tickets")
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;

-- Remove duplicate SELECT policy on support_tickets (keep "Customers can view their own tickets" which also allows staff)
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;

-- Remove duplicate INSERT policy on ticket_messages (keep "Users can send messages on their tickets" which also covers staff)
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON public.ticket_messages;

-- Remove duplicate SELECT policy on ticket_messages (keep "Users can view messages on their tickets" which also covers staff)
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
