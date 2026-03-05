
-- Fix: Set view to SECURITY INVOKER so it respects the querying user's permissions
ALTER VIEW public.orders_seller_view SET (security_invoker = on);
