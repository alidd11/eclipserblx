import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from './useSellerStatus';
import { openExternalUrl } from '@/lib/externalBrowser';

export type SellerBillingPeriod = 'monthly' | 'annual';

export interface SellerProLimits {
  commissionRate: number;
  maxFileSizeMb: number;
  maxImages: number;
  maxProductFiles: number;
  maxProducts: number | null;
  maxStorePages: number;
  monthlyAdCredit: number;
  proBadge: boolean;
  priorityReview: boolean;
  storeThemes: 'default' | 'all';
  maxNavLinks: number;
  announcementBar: boolean;
  analyticsRetentionDays: number;
  analyticsExport: boolean;
  maxActiveDiscounts: number | null;
  scheduledBanner: boolean;
}

const PROMO_LIMITS: SellerProLimits = {
  commissionRate: 0,
  maxFileSizeMb: 200,
  maxImages: 5,
  maxProductFiles: 1,
  maxProducts: 25,
  maxStorePages: 1,
  monthlyAdCredit: 0,
  proBadge: false,
  priorityReview: false,
  storeThemes: 'default',
  maxNavLinks: 2,
  announcementBar: false,
  analyticsRetentionDays: 30,
  analyticsExport: false,
  maxActiveDiscounts: 1,
  scheduledBanner: false,
};

const FREE_LIMITS: SellerProLimits = {
  commissionRate: 15,
  maxFileSizeMb: 200,
  maxImages: 5,
  maxProductFiles: 1,
  maxProducts: 25,
  maxStorePages: 1,
  monthlyAdCredit: 0,
  proBadge: false,
  priorityReview: false,
  storeThemes: 'default',
  maxNavLinks: 2,
  announcementBar: false,
  analyticsRetentionDays: 30,
  analyticsExport: false,
  maxActiveDiscounts: 1,
  scheduledBanner: false,
};

const PRO_LIMITS: SellerProLimits = {
  commissionRate: 10,
  maxFileSizeMb: 500,
  maxImages: 15,
  maxProductFiles: 3,
  maxProducts: null,
  maxStorePages: 5,
  monthlyAdCredit: 5,
  proBadge: true,
  priorityReview: true,
  storeThemes: 'all',
  maxNavLinks: 10,
  announcementBar: true,
  analyticsRetentionDays: 90,
  analyticsExport: true,
  maxActiveDiscounts: null,
  scheduledBanner: true,
};

const GRACE_PERIOD_DAYS = 7;

interface SellerSubscriptionState {
  isPro: boolean;
  subscriptionEnd: string | null;
  status: string | null;
  isLoading: boolean;
  isGracePeriod: boolean;
  gracePeriodEndsAt: string | null;
}

export function useSellerSubscription() {
  const { user } = useAuth();
  const { store } = useSellerStatus();
  const [state, setState] = useState<SellerSubscriptionState>({
    isPro: false,
    subscriptionEnd: null,
    status: null,
    isLoading: true,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setState({ isPro: false, subscriptionEnd: null, status: null, isLoading: false });
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('seller_subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching seller subscription:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const isActive = data?.status === 'active';
      setState({
        isPro: isActive,
        subscriptionEnd: data?.current_period_end || null,
        status: data?.status || null,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error fetching seller subscription:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const subscribe = useCallback(async (billingPeriod: SellerBillingPeriod = 'monthly') => {
    if (!user) throw new Error('Must be logged in');

    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: {
        product_type: 'seller_pro',
        billingPeriod,
        store_id: store?.id,
      },
    });

    if (error) throw error;
    if (data?.url) {
      openExternalUrl(data.url);
    }
    return data;
  }, [user, store?.id]);

  const openPortal = useCallback(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data, error } = await supabase.functions.invoke('customer-portal', {});
    if (error) throw error;
    if (data?.url) {
      openExternalUrl(data.url);
    }
    return data;
  }, [user]);

  // Check if seller is in the free commission promo period
  const inFreePromo = store?.free_commission_until 
    ? new Date(store.free_commission_until) > new Date() 
    : false;
  const freePromoEndsAt = store?.free_commission_until || null;

  const limits: SellerProLimits = state.isPro 
    ? PRO_LIMITS 
    : inFreePromo 
      ? PROMO_LIMITS 
      : FREE_LIMITS;

  return {
    ...state,
    inFreePromo,
    freePromoEndsAt,
    limits,
    subscribe,
    openPortal,
    refresh: fetchSubscription,
    prices: {
      monthly: 7.99,
      annual: 69.99,
      annualSavingsPercent: 27,
    },
  };
}
