
-- Email masking function was already created in the failed migration's first part
-- Just need to create the view with correct columns

CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  local_part text;
  domain_part text;
  at_pos integer;
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN email;
  END IF;
  at_pos := position('@' in email);
  IF at_pos = 0 THEN
    RETURN '***';
  END IF;
  local_part := substring(email from 1 for at_pos - 1);
  domain_part := substring(email from at_pos);
  IF length(local_part) <= 2 THEN
    RETURN local_part || '***' || domain_part;
  ELSE
    RETURN substring(local_part from 1 for 2) || '***' || domain_part;
  END IF;
END;
$$;

-- Secure view: masks customer email for non-owners/non-staff
CREATE OR REPLACE VIEW public.orders_seller_view AS
SELECT
  o.id,
  o.user_id,
  o.status,
  o.total,
  o.subtotal,
  o.payment_method,
  o.payment_id,
  o.created_at,
  o.updated_at,
  CASE 
    WHEN o.user_id = auth.uid() THEN o.customer_email
    WHEN has_permission(auth.uid(), 'view_orders') THEN o.customer_email
    ELSE mask_email(o.customer_email)
  END as customer_email,
  o.discount_amount,
  o.discount_code_id,
  o.refunded_at,
  o.refund_amount,
  o.refund_id
FROM public.orders o;
