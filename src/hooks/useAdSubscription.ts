import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { openExternalUrl } from '@/lib/externalBrowser';
import { useRef, useEffect, useCallback } from 'react';

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
  max_images: number;
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
  here_pings_balance: number;
  everyone_pings_balance: number;
  partnership_pings_balance: number;
}

// Ads per month by tier
const TIER_ADS: Record<string, number> = {
  basic: 3,
  pro: 10,
  premium: 30,
};

// Background Stripe sync interval: 30 minutes
const STRIPE_SYNC_INTERVAL = 30 * 60 * 1000;

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
       })) as AdTierData[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdSubscription() {
  const { session } = useAuth();
  const lastSyncRef = useRef<number>(0);
  const queryClient = useQueryClient();

  // Background Stripe sync (fire-and-forget)
  const syncWithStripe = useCallback(async () => {
    if (!session?.access_token) return;
    const now = Date.now();
    if (now - lastSyncRef.current < STRIPE_SYNC_INTERVAL) return;
    lastSyncRef.current = now;

    try {
      await supabase.functions.invoke('check-ad-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      // Re-read from DB after sync
      queryClient.invalidateQueries({ queryKey: ['ad-subscription'] });
    } catch (err) {
      console.error('Background ad subscription sync failed:', err);
    }
  }, [session, queryClient]);

  // Schedule background sync
  useEffect(() => {
    if (!session?.user) return;
    const timer = setTimeout(syncWithStripe, 5000);
    const interval = setInterval(syncWithStripe, STRIPE_SYNC_INTERVAL);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [session?.user, syncWithStripe]);

  return useQuery({
    queryKey: ['ad-subscription', session?.user?.id],
    queryFn: async (): Promise<AdSubscriptionStatus> => {
      // Read directly from DB (no edge function invocation)
      const { data: localSub, error } = await supabase
        .from('advertisement_subscriptions')
        .select('*')
        .eq('user_id', session!.user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (!localSub) {
        return {
          subscribed: false, tier: null, tier_name: null,
          ads_remaining: 0, ads_per_month: 0, ads_used: 0,
          current_period_end: null, billing_period: null,
          here_pings_balance: 0, everyone_pings_balance: 0, partnership_pings_balance: 0,
        };
      }

      const adsPerMonth = TIER_ADS[localSub.tier] || 0;
      const adsUsed = localSub.ads_used_this_month || 0;

      return {
        subscribed: true,
        tier: localSub.tier as AdTier,
        tier_name: localSub.tier.charAt(0).toUpperCase() + localSub.tier.slice(1),
        ads_remaining: Math.max(0, adsPerMonth - adsUsed),
        ads_per_month: adsPerMonth,
        ads_used: adsUsed,
        current_period_end: localSub.current_period_end,
        billing_period: (localSub.billing_period as AdBillingPeriod) || null,
        here_pings_balance: localSub.here_pings_balance || 0,
        everyone_pings_balance: localSub.everyone_pings_balance || 0,
        partnership_pings_balance: localSub.partnership_pings_balance || 0,
      };
    },
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useAdSubscriptionCheckout() {
  const { session } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      tier, 
      billingPeriod, 
      herePings = 0, 
      everyonePings = 0 
    }: { 
      tier: AdTier; 
      billingPeriod: AdBillingPeriod;
      herePings?: number;
      everyonePings?: number;
    }) => {
      if (!session?.access_token) {
        throw new Error('Please sign in to subscribe');
      }
      
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { product_type: 'ad_subscription', tier, billingPeriod, herePings, everyonePings },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: async (data) => {
      if (data.url) {
        await openExternalUrl(data.url);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start checkout');
    },
  });
}

// Returns config for embedded payment modal instead of redirecting
export function usePurchasePingsConfig() {
  const { session } = useAuth();
  
  const validatePingPurchase = ({ 
    herePings = 0, 
    everyonePings = 0 
  }: { 
    herePings?: number;
    everyonePings?: number;
  }): { valid: boolean; herePings: number; everyonePings: number; error?: string } => {
    if (!session?.access_token) {
      return { valid: false, herePings, everyonePings, error: 'Please sign in to purchase pings' };
    }
    
    if (herePings === 0 && everyonePings === 0) {
      return { valid: false, herePings, everyonePings, error: 'Please select at least one ping to purchase' };
    }
    
    return { valid: true, herePings, everyonePings };
  };
  
  return { validatePingPurchase };
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
