import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type AdTier = 'basic' | 'pro' | 'premium';
export type AdBillingPeriod = 'monthly' | 'annual';

export interface AdTierData {
  id: string;
  tier: AdTier;
  name: string;
  description: string | null;
  ads_per_month: number;
  monthly_price_gbp: number;
  annual_price_gbp: number;
  here_ping_price_gbp: number;
  everyone_ping_price_gbp: number;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  features: string[];
  display_order: number;
  is_active: boolean;
}

export interface AdSubscriptionStatus {
  subscribed: boolean;
  tier: AdTier | null;
  tier_name: string | null;
  ads_remaining: number;
  ads_per_month: number;
  ads_used: number;
  current_period_end: string | null;
  billing_period: AdBillingPeriod | null;
}

export function useAdTiers() {
  return useQuery({
    queryKey: ['advertisement-tiers'],
    queryFn: async (): Promise<AdTierData[]> => {
      const { data, error } = await supabase
        .from('advertisement_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(tier => ({
        ...tier,
        tier: tier.tier as AdTier,
        features: Array.isArray(tier.features) ? tier.features as string[] : [],
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdSubscription() {
  const { session } = useAuth();
  
  return useQuery({
    queryKey: ['ad-subscription', session?.user?.id],
    queryFn: async (): Promise<AdSubscriptionStatus> => {
      const { data, error } = await supabase.functions.invoke('check-ad-subscription', {
        headers: session?.access_token 
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      
      if (error) throw error;
      
      return {
        subscribed: data.subscribed || false,
        tier: data.tier || null,
        tier_name: data.tier_name || null,
        ads_remaining: data.ads_remaining || 0,
        ads_per_month: data.ads_per_month || 0,
        ads_used: data.ads_used || 0,
        current_period_end: data.current_period_end || null,
        billing_period: data.billing_period || null,
      };
    },
    enabled: !!session?.user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

export function useAdSubscriptionCheckout() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tier, billingPeriod }: { tier: AdTier; billingPeriod: AdBillingPeriod }) => {
      if (!session?.access_token) {
        throw new Error('Please sign in to subscribe');
      }
      
      const { data, error } = await supabase.functions.invoke('create-ad-subscription-checkout', {
        body: { tier, billingPeriod },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start checkout');
    },
  });
}

export function calculateAdAnnualSavings(monthlyPrice: number, annualPrice: number): number {
  const yearlyAtMonthlyRate = monthlyPrice * 12;
  return yearlyAtMonthlyRate - annualPrice;
}

export function calculateAdAnnualSavingsPercent(monthlyPrice: number, annualPrice: number): number {
  const yearlyAtMonthlyRate = monthlyPrice * 12;
  if (yearlyAtMonthlyRate === 0) return 0;
  return Math.round(((yearlyAtMonthlyRate - annualPrice) / yearlyAtMonthlyRate) * 100);
}
