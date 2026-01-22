-- Fix function search paths
CREATE OR REPLACE FUNCTION public.escalate_unanswered_tickets()
RETURNS INTEGER AS $$
DECLARE
  escalated_count INTEGER;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_ticket_staff_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_staff_reply = true THEN
    UPDATE public.seller_support_tickets
    SET 
      last_staff_response_at = NOW(),
      escalated_at = NULL
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;