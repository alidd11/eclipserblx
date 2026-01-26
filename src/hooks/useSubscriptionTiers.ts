import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'basic' | 'pro' | 'premium';
export type BillingPeriod = 'monthly' | 'annual';

export interface TierData {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string | null;
  discount_percentage: number;
  free_products_per_month: number;
  monthly_price_gbp: number;
  annual_price_gbp: number;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  features: string[];
  display_order: number;
  is_active: boolean;
}

export function useSubscriptionTiers() {
  return useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: async (): Promise<TierData[]> => {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(tier => ({
        ...tier,
        features: Array.isArray(tier.features) ? tier.features as string[] : [],
      }));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
  const yearlyAtMonthlyRate = monthlyPrice * 12;
  return yearlyAtMonthlyRate - annualPrice;
}

export function calculateAnnualSavingsPercent(monthlyPrice: number, annualPrice: number): number {
  const yearlyAtMonthlyRate = monthlyPrice * 12;
  if (yearlyAtMonthlyRate === 0) return 0;
  return Math.round(((yearlyAtMonthlyRate - annualPrice) / yearlyAtMonthlyRate) * 100);
}
