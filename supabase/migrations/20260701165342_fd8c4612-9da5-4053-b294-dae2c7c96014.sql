-- Fix broken trigger that references non-existent column NEW.is_admin on ticket_messages
CREATE OR REPLACE FUNCTION public.set_ticket_first_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sender_type IN ('staff','agent') THEN
    UPDATE public.support_tickets
    SET first_response_at = NOW()
    WHERE id = NEW.ticket_id
      AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- Add missing attachment_url column (client code and admin UI expect it)
ALTER TABLE public.ticket_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;