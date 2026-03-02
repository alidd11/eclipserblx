-- Add 'awaiting_customer' to the support_tickets status check constraint
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check 
  CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'awaiting_customer'::text, 'resolved'::text, 'closed'::text]));