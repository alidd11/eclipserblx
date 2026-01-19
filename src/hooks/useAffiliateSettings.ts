import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateSettings {
  commissionRate: number; // percentage (e.g., 10 for 10%)
  minimumPayout: number; // in GBP (e.g., 10 for £10)
}

const DEFAULT_SETTINGS: AffiliateSettings = {
  commissionRate: 10,
  minimumPayout: 10,
};

export function useAffiliateSettings() {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['affiliate-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['affiliate_commission_rate', 'affiliate_minimum_payout']);

      if (error) throw error;

      const result: AffiliateSettings = { ...DEFAULT_SETTINGS };
      
      data?.forEach((item) => {
        const val = typeof item.value === 'string' 
          ? item.value.replace(/^"|"$/g, '') 
          : item.value;
        
        if (item.key === 'affiliate_commission_rate') {
          result.commissionRate = parseFloat(String(val)) || DEFAULT_SETTINGS.commissionRate;
        } else if (item.key === 'affiliate_minimum_payout') {
          result.minimumPayout = parseFloat(String(val)) || DEFAULT_SETTINGS.minimumPayout;
        }
      });

      return result;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
    error,
  };
}
