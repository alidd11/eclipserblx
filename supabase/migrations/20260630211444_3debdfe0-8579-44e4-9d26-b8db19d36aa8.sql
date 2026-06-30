
CREATE OR REPLACE FUNCTION public.orion_enqueue_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_type text;
  payload jsonb;
BEGIN
  event_type := TG_ARGV[0] || '.' || lower(TG_OP);
  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'op', TG_OP,
    'new', to_jsonb(NEW),
    'old', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );
  INSERT INTO public.orion_event_outbox (event_type, payload, status, attempts)
  VALUES (event_type, payload, 'pending', 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orion_orders_insert ON public.orders;
CREATE TRIGGER orion_orders_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orion_enqueue_event('order');

DROP TRIGGER IF EXISTS orion_incidents_insert ON public.incidents;
CREATE TRIGGER orion_incidents_insert
AFTER INSERT ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.orion_enqueue_event('incident');

DROP TRIGGER IF EXISTS orion_incidents_update ON public.incidents;
CREATE TRIGGER orion_incidents_update
AFTER UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.orion_enqueue_event('incident');

DROP TRIGGER IF EXISTS orion_compliance_insert ON public.compliance_violations;
CREATE TRIGGER orion_compliance_insert
AFTER INSERT ON public.compliance_violations
FOR EACH ROW EXECUTE FUNCTION public.orion_enqueue_event('compliance_violation');
