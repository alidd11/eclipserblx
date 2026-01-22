-- Add escalation tracking to seller support tickets
ALTER TABLE public.seller_support_tickets 
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_staff_response_at TIMESTAMP WITH TIME ZONE;

-- Create function to escalate unanswered tickets
CREATE OR REPLACE FUNCTION public.escalate_unanswered_tickets()
RETURNS INTEGER AS $$
DECLARE
  escalated_count INTEGER;
BEGIN
  -- Escalate tickets that are:
  -- 1. Open or in_progress status
  -- 2. Not already escalated
  -- 3. Either never had a staff response and created 24+ hours ago
  --    OR last staff response was 24+ hours ago
  UPDATE public.seller_support_tickets
  SET 
    escalated_at = NOW(),
    priority = 'urgent'
  WHERE 
    status IN ('open', 'in_progress')
    AND escalated_at IS NULL
    AND (
      (last_staff_response_at IS NULL AND created_at < NOW() - INTERVAL '24 hours')
      OR (last_staff_response_at IS NOT NULL AND last_staff_response_at < NOW() - INTERVAL '24 hours')
    );
  
  GET DIAGNOSTICS escalated_count = ROW_COUNT;
  RETURN escalated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_staff_response_at when staff replies
CREATE OR REPLACE FUNCTION public.update_ticket_staff_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_staff_reply = true THEN
    UPDATE public.seller_support_tickets
    SET 
      last_staff_response_at = NOW(),
      escalated_at = NULL -- Clear escalation when staff responds
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_staff_reply_update_ticket ON public.seller_ticket_messages;
CREATE TRIGGER on_staff_reply_update_ticket
  AFTER INSERT ON public.seller_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_staff_response();

-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;