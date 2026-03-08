-- Fix orders_seller_view to use SECURITY INVOKER so underlying RLS applies
ALTER VIEW public.orders_seller_view SET (security_invoker = on);