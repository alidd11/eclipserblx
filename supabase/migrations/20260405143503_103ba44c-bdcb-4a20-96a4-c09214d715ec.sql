-- Add escalation columns to customer support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS last_staff_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- Create trigger function for customer ticket staff responses
CREATE OR REPLACE FUNCTION public.update_customer_ticket_staff_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.sender_type = 'agent' OR NEW.sender_type = 'staff' THEN
    UPDATE public.support_tickets
    SET 
      last_staff_response_at = NOW(),
      escalated_at = NULL
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on ticket_messages for customer tickets
DROP TRIGGER IF EXISTS trg_update_customer_ticket_staff_response ON public.ticket_messages;
CREATE TRIGGER trg_update_customer_ticket_staff_response
AFTER INSERT ON public.ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_ticket_staff_response();

-- Create escalation function for customer tickets
CREATE OR REPLACE FUNCTION public.escalate_unanswered_customer_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  escalated_count INTEGER;
BEGIN
  UPDATE public.support_tickets
  SET 
    escalated_at = NOW(),
    priority = 'high'
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
$$;

-- Combined function that escalates both seller and customer tickets
CREATE OR REPLACE FUNCTION public.auto_escalate_all_tickets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seller_count INTEGER;
  customer_count INTEGER;
BEGIN
  SELECT public.escalate_unanswered_tickets() INTO seller_count;
  SELECT public.escalate_unanswered_customer_tickets() INTO customer_count;
  
  RETURN jsonb_build_object(
    'seller_escalated', seller_count,
    'customer_escalated', customer_count,
    'timestamp', NOW()
  );
END;
$$;