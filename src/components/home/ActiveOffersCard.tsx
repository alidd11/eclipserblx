import { forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Badge } from '@/components/ui/badge';
import { Gift, Tag, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { format } from '@/lib/dateUtils';

import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  min_order_amount: number | null;
}

export const ActiveOffersCard = forwardRef<HTMLDivElement>(function ActiveOffersCard(_props, ref) {
  const { loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  // Fetch active discount codes
  const { data: discountCodes = [], isLoading: discountCodesLoading } = useQuery({
    queryKey: ['active-discount-codes'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('discount_codes')
        .select('id, code, discount_type, discount_value, expires_at, min_order_amount')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as DiscountCode[];
    },
    enabled: !authLoading,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const isInitialLoading = authLoading || discountCodesLoading;

  // Hide entirely while loading OR when there are no offers — prevents empty-card flicker
  if (isInitialLoading || discountCodes.length === 0) return null;

  const formatDiscount = (code: DiscountCode) => {
    if (code.discount_type === 'percentage') {
      return t('offers.percentOff', { value: code.discount_value });
    }
    return t('offers.amountOff', { amount: code.discount_value.toFixed(2) });
  };

  const Wrapper = reducedMotion ? 'div' : motion.div;
  const wrapperProps = reducedMotion ? {} : {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.3, duration: 0.4 },
  };

  return (
    <Wrapper ref={ref} {...wrapperProps as any}>
      <div className="p-0">
        <div className="flex items-center gap-2 px-3 py-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
            <Gift className="h-3 w-3 text-foreground" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('offers.activeOffers')}</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {discountCodes.map((code) => (
            <div
              key={code.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:border-border transition-colors"
            >
              <div className="flex-shrink-0 p-2 rounded-full bg-muted">
                <Tag className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="font-mono text-xs bg-muted text-foreground border-0">
                    {code.code}
                  </Badge>
                  <span className="font-semibold text-sm text-primary">
                    {formatDiscount(code)}
                  </span>
                </div>
                {code.min_order_amount && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('offers.minOrder', { amount: code.min_order_amount.toFixed(2) })}
                  </p>
                )}
                {code.expires_at && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {t('offers.expires', { date: format(new Date(code.expires_at), 'MMM d') })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  );
});
