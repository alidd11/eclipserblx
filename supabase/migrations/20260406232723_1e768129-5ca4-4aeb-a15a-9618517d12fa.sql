
-- 1. CSAT / Ticket Satisfaction
CREATE TABLE public.ticket_satisfaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  ticket_type TEXT NOT NULL DEFAULT 'customer',
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, ticket_type)
);

ALTER TABLE public.ticket_satisfaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can rate their own tickets"
  ON public.ticket_satisfaction FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ratings"
  ON public.ticket_satisfaction FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- 2. Canned Responses (staff-managed)
CREATE TABLE public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all canned responses"
  ON public.canned_responses FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create canned responses"
  ON public.canned_responses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Staff can update own canned responses"
  ON public.canned_responses FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Staff can delete own canned responses"
  ON public.canned_responses FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()) AND auth.uid() = created_by);

-- 3. SLA + Snooze columns on support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

-- 4. SLA + Snooze columns on seller_support_tickets
ALTER TABLE public.seller_support_tickets
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

-- 5. Trigger: Set first_response_at on support_tickets when first staff message arrives
CREATE OR REPLACE FUNCTION public.set_ticket_first_response()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- ticket_messages: is_admin = true means staff reply
  IF NEW.is_admin = true THEN
    UPDATE public.support_tickets
    SET first_response_at = NOW()
    WHERE id = NEW.ticket_id
      AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_customer_ticket_first_response
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_first_response();

-- 6. Trigger: Set first_response_at on seller_support_tickets when first staff message arrives
CREATE OR REPLACE FUNCTION public.set_seller_ticket_first_response()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_admin = true THEN
    UPDATE public.seller_support_tickets
    SET first_response_at = NOW()
    WHERE id = NEW.ticket_id
      AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_seller_ticket_first_response
  AFTER INSERT ON public.seller_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seller_ticket_first_response();

-- 7. Trigger: Set resolved_at on support_tickets when status → resolved/closed
CREATE OR REPLACE FUNCTION public.set_ticket_resolved_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
    NEW.resolved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_support_ticket_resolved_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_resolved_at();

CREATE TRIGGER trg_set_seller_ticket_resolved_at
  BEFORE UPDATE ON public.seller_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_resolved_at();
