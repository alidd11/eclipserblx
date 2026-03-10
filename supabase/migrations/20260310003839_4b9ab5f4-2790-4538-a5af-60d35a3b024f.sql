
-- orders_seller_view: revoke anon access (view already has security_invoker=on for RLS inheritance)
REVOKE SELECT ON public.orders_seller_view FROM anon;

-- Also secure the stores_public and products_public views - revoke from anon to force through base table column grants
-- (These views have security_invoker=on so they inherit the base table RLS + column grants)
