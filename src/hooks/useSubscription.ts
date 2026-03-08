import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { openExternalUrl } from '@/lib/externalBrowser';

// Bot category ID - products in this category get a higher discount
export const BOT_CATEGORY_ID = "852838dc-adb6-4154-93fe-d1814fe46263";

// Eclipse Savers category ID - products in this category do NOT get Eclipse+ discounts
export const ECLIPSE_SAVERS_CATEGORY_ID = "26463de5-38f4-4203-a379-78f6f92be3c7";

// Fixed Eclipse+ discount percentages
export const ECLIPSE_PLUS_DISCOUNT = 30;
export const ECLIPSE_PLUS_BOT_DISCOUNT = 35;

interface SubscriptionState {
  isSubscribed: boolean;
  subscriptionEnd: string | null;
  subscriptionId: string | null;
  freeProductsClaimed: number;
  canClaimFree: boolean;
  claimedThisMonth: boolean;
  claimedProductId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Background sync interval: 30 minutes (Stripe sync only)
const STRIPE_SYNC_INTERVAL = 30 * 60 * 1000;

export function useSubscription() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const lastSyncRef = useRef<number>(0);
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    subscriptionEnd: null,
    subscriptionId: null,
    freeProductsClaimed: 0,
    canClaimFree: false,
    claimedThisMonth: false,
    claimedProductId: null,
    isLoading: true,
    error: null,
  });

  // Fast path: read directly from DB (no edge function invocation)
  const readFromDB = useCallback(async () => {
    if (!user) {
      setState({
        isSubscribed: false, subscriptionEnd: null, subscriptionId: null,
        freeProductsClaimed: 0, canClaimFree: false, claimedThisMonth: false,
        claimedProductId: null, isLoading: false, error: null,
      });
      return;
    }

    try {
      // Parallel queries: subscription + free claims
      const currentMonth = new Date().toISOString().slice(0, 7);
      const [subResult, claimsResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('status, current_period_end, stripe_subscription_id, granted_by')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('subscription_free_claims')
          .select('id, product_id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('claim_period', currentMonth),
      ]);

      const sub = subResult.data;
      const isActive = sub && sub.current_period_end && new Date(sub.current_period_end) > new Date();
      const freeProductsClaimed = claimsResult.count || 0;
      const lastClaimed = claimsResult.data?.length ? claimsResult.data[claimsResult.data.length - 1]?.product_id : null;

      setState({
        isSubscribed: !!isActive,
        subscriptionEnd: isActive ? sub.current_period_end : null,
        subscriptionId: isActive ? sub.stripe_subscription_id : null,
        freeProductsClaimed,
        canClaimFree: !!isActive && freeProductsClaimed < 1,
        claimedThisMonth: freeProductsClaimed > 0,
        claimedProductId: lastClaimed || null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error reading subscription from DB:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check subscription',
      }));
    }
  }, [user]);

  // Slow path: sync with Stripe via edge function (background, infrequent)
  const syncWithStripe = useCallback(async () => {
    if (!user || !session?.access_token) return;
    
    const now = Date.now();
    if (now - lastSyncRef.current < STRIPE_SYNC_INTERVAL) return;
    lastSyncRef.current = now;

    try {
      await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      // After sync, re-read from DB to pick up any changes
      await readFromDB();
    } catch (error) {
      console.error('Background Stripe sync failed:', error);
    }
  }, [user, session, readFromDB]);

  // Initial load: read from DB immediately, then sync with Stripe in background
  useEffect(() => {
    readFromDB();
  }, [readFromDB]);

  useEffect(() => {
    if (!user) return;
    // Delay initial Stripe sync to not block page load
    const timer = setTimeout(syncWithStripe, 5000);
    const interval = setInterval(syncWithStripe, STRIPE_SYNC_INTERVAL);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [user, syncWithStripe]);

  const subscribe = useCallback(async () => {
    if (!user) throw new Error('You must be logged in to subscribe');

    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: { product_type: 'eclipse_plus', tier: 'pro', billingPeriod: 'monthly' },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    if (data.url) window.location.href = data.url;
  }, [user, session]);

  const openCustomerPortal = useCallback(async () => {
    if (!user) throw new Error('You must be logged in to manage your subscription');

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    if (data.url) await openExternalUrl(data.url);
  }, [user, session]);

  const claimFreeProduct = useCallback(async (productId: string) => {
    if (!user) throw new Error('You must be logged in to claim a free product');
    if (!state.isSubscribed) throw new Error('You must have an active Eclipse+ subscription to claim free products');
    if (!state.canClaimFree) throw new Error('You have already claimed your free product this month');

    const { data, error } = await supabase.functions.invoke('claim-free-product', {
      body: { productId },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    
    await readFromDB();
    queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    return data;
  }, [user, session, state.isSubscribed, state.canClaimFree, readFromDB, queryClient]);

  const getMemberPrice = useCallback((originalPrice: number, categoryId?: string | null, isResellable?: boolean): number => {
    if (isResellable) return originalPrice;
    if (categoryId === ECLIPSE_SAVERS_CATEGORY_ID) return originalPrice;
    if (categoryId === BOT_CATEGORY_ID) return originalPrice * (1 - ECLIPSE_PLUS_BOT_DISCOUNT / 100);
    return originalPrice * (1 - ECLIPSE_PLUS_DISCOUNT / 100);
  }, []);

  const isEligibleForDiscount = useCallback((categoryId?: string | null, isResellable?: boolean, storeEclipseEnabled?: boolean): boolean => {
    if (storeEclipseEnabled === false) return false;
    if (isResellable) return false;
    return categoryId !== ECLIPSE_SAVERS_CATEGORY_ID;
  }, []);

  const getDiscountPercent = useCallback((categoryId?: string | null, isResellable?: boolean): number => {
    if (isResellable) return 0;
    if (categoryId === ECLIPSE_SAVERS_CATEGORY_ID) return 0;
    if (categoryId === BOT_CATEGORY_ID) return ECLIPSE_PLUS_BOT_DISCOUNT;
    return ECLIPSE_PLUS_DISCOUNT;
  }, []);

  const isEligibleForFreeClaim = useCallback((categoryId?: string | null, isResellable?: boolean, eclipseFreeEligible?: boolean): boolean => {
    if (eclipseFreeEligible === false) return false;
    if (isResellable) return false;
    return categoryId !== BOT_CATEGORY_ID && categoryId !== ECLIPSE_SAVERS_CATEGORY_ID;
  }, []);

  return {
    ...state,
    tier: state.isSubscribed ? 'pro' : null,
    billingPeriod: state.isSubscribed ? 'monthly' : null,
    discountPercent: state.isSubscribed ? ECLIPSE_PLUS_DISCOUNT : 0,
    freeProductsPerMonth: state.isSubscribed ? 1 : 0,
    checkSubscription: readFromDB,
    subscribe,
    openCustomerPortal,
    claimFreeProduct,
    getMemberPrice,
    getDiscountPercent,
    isEligibleForDiscount,
    isEligibleForFreeClaim,
  };
}
