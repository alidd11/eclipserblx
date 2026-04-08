
-- Base tables
GRANT SELECT, INSERT, UPDATE ON public.seller_payouts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.affiliate_payouts TO authenticated;
GRANT SELECT, UPDATE ON public.developer_payments TO authenticated;

-- Safe/masked views (read-only)
GRANT SELECT ON public.seller_payouts_safe TO authenticated;
GRANT SELECT ON public.seller_payouts_masked TO authenticated;
GRANT SELECT ON public.affiliate_payouts_safe TO authenticated;
GRANT SELECT ON public.affiliate_payouts_masked TO authenticated;
