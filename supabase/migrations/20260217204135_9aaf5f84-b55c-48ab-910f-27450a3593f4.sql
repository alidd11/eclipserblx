
CREATE OR REPLACE FUNCTION public.update_ticket_staff_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_admin = true THEN
    UPDATE public.seller_support_tickets
    SET 
      last_staff_response_at = NOW(),
      escalated_at = NULL
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$function$;
