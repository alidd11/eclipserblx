-- Fix SECURITY DEFINER on stores_public view - make it SECURITY INVOKER
ALTER VIEW public.stores_public SET (security_invoker = on);