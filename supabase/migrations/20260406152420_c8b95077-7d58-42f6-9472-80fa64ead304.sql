-- Fix security definer view: store_domains_public → security invoker
ALTER VIEW public.store_domains_public SET (security_invoker = on);