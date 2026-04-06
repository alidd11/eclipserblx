
-- Fix all views to be SECURITY INVOKER
ALTER VIEW public.store_credentials_safe SET (security_invoker = on);
ALTER VIEW public.store_payment_details_safe SET (security_invoker = on);
ALTER VIEW public.user_payment_details_safe SET (security_invoker = on);
ALTER VIEW public.seller_payouts_safe SET (security_invoker = on);
ALTER VIEW public.affiliate_payouts_safe SET (security_invoker = on);
