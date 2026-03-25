
-- Round-robin auto-assignment function
-- Picks the on-duty agent with the fewest open tickets across both tables
CREATE OR REPLACE FUNCTION public.auto_assign_ticket_round_robin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  -- Only assign if not already assigned
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find on-duty staff (clocked in, not clocked out) with fewest open tickets
  -- Uses both support_tickets and seller_support_tickets for fair distribution
  SELECT sdl.user_id INTO v_agent_id
  FROM public.staff_duty_logs sdl
  WHERE sdl.clock_out IS NULL
  ORDER BY (
    -- Count open tickets assigned to this agent across both tables
    (SELECT COUNT(*) FROM public.support_tickets st 
     WHERE st.assigned_to = sdl.user_id AND st.status IN ('open', 'in_progress'))
    +
    (SELECT COUNT(*) FROM public.seller_support_tickets sst 
     WHERE sst.assigned_to = sdl.user_id AND sst.status IN ('open', 'in_progress'))
  ) ASC,
  sdl.clock_in ASC  -- tie-breaker: longest on duty gets next ticket
  LIMIT 1;

  -- Assign if an agent was found, also set status to in_progress
  IF v_agent_id IS NOT NULL THEN
    NEW.assigned_to := v_agent_id;
    NEW.status := 'in_progress';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for customer support tickets
CREATE TRIGGER trg_auto_assign_support_ticket
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_ticket_round_robin();

-- Trigger for seller support tickets
CREATE TRIGGER trg_auto_assign_seller_ticket
  BEFORE INSERT ON public.seller_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_ticket_round_robin();
