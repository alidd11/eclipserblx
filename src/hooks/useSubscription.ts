import { useState, useEffect, useCallback } from 'react';
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

export function useSubscription() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
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

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({
        isSubscribed: false,
        subscriptionEnd: null,
        subscriptionId: null,
        freeProductsClaimed: 0,
        canClaimFree: false,
        claimedThisMonth: false,
        claimedProductId: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
      
      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setState({
        isSubscribed: data.subscribed || false,
        subscriptionEnd: data.subscriptionEnd || null,
        subscriptionId: data.subscriptionId || null,
        freeProductsClaimed: data.freeProductsClaimed || 0,
        canClaimFree: data.canClaimFree || false,
        claimedThisMonth: data.claimedThisMonth || false,
        claimedProductId: data.claimedProductId || null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check subscription',
      }));
    }
  }, [user, session]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Periodic refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const subscribe = useCallback(async () => {
    if (!user) {
      throw new Error('You must be logged in to subscribe');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { tier: 'pro', billingPeriod: 'monthly' },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating subscription checkout:', error);
      throw error;
    }
  }, [user, session]);

  const openCustomerPortal = useCallback(async () => {
    if (!user) {
      throw new Error('You must be logged in to manage your subscription');
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.url) {
        await openExternalUrl(data.url);
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  }, [user, session]);

  const claimFreeProduct = useCallback(async (productId: string) => {
    if (!user) {
      throw new Error('You must be logged in to claim a free product');
    }

    if (!state.isSubscribed) {
      throw new Error('You must have an active Eclipse+ subscription to claim free products');
    }

    if (!state.canClaimFree) {
      throw new Error('You have already claimed your free product this month');
    }

    try {
      const { data, error } = await supabase.functions.invoke('claim-free-product', {
        body: { productId },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Refresh subscription state
      await checkSubscription();
      
      // Invalidate orders query to show the new order
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      
      return data;
    } catch (error) {
      console.error('Error claiming free product:', error);
      throw error;
    }
  }, [user, session, state.isSubscribed, state.canClaimFree, checkSubscription, queryClient]);

  // Calculate member price for a product (fixed 30% discount)
  const getMemberPrice = useCallback((originalPrice: number, categoryId?: string | null, isResellable?: boolean): number => {
    // Resellable products do NOT get any discount
    if (isResellable) {
      return originalPrice;
    }
    // Eclipse Savers products do NOT get any discount
    if (categoryId === ECLIPSE_SAVERS_CATEGORY_ID) {
      return originalPrice;
    }
    
    // Bot products get 35% discount
    if (categoryId === BOT_CATEGORY_ID) {
      return originalPrice * (1 - ECLIPSE_PLUS_BOT_DISCOUNT / 100);
    }
    
    // All other products get 30% discount
    return originalPrice * (1 - ECLIPSE_PLUS_DISCOUNT / 100);
  }, []);

  // Check if a product is eligible for the discount
  const isEligibleForDiscount = useCallback((categoryId?: string | null, isResellable?: boolean, storeEclipseEnabled?: boolean): boolean => {
    // Store has opted out of Eclipse+ discounts
    if (storeEclipseEnabled === false) return false;
    // Resellable products are NOT eligible for discounts
    if (isResellable) return false;
    // Eclipse Savers products are NOT eligible for discounts
    return categoryId !== ECLIPSE_SAVERS_CATEGORY_ID;
  }, []);

  // Get the discount percentage for a product category (fixed values)
  const getDiscountPercent = useCallback((categoryId?: string | null, isResellable?: boolean): number => {
    // Resellable products get 0% discount
    if (isResellable) return 0;
    // Eclipse Savers get 0% discount
    if (categoryId === ECLIPSE_SAVERS_CATEGORY_ID) return 0;
    // Bot products get 35%
    if (categoryId === BOT_CATEGORY_ID) return ECLIPSE_PLUS_BOT_DISCOUNT;
    // All other products get 30%
    return ECLIPSE_PLUS_DISCOUNT;
  }, []);

  // Check if a product is eligible for free claim
  const isEligibleForFreeClaim = useCallback((categoryId?: string | null, isResellable?: boolean, eclipseFreeEligible?: boolean): boolean => {
    // Seller opted out of free claims
    if (eclipseFreeEligible === false) return false;
    // Resellable products are NOT eligible for free claims
    if (isResellable) return false;
    // Neither Bots nor Eclipse Savers are eligible for free claims
    return categoryId !== BOT_CATEGORY_ID && categoryId !== ECLIPSE_SAVERS_CATEGORY_ID;
  }, []);

  return {
    ...state,
    // Add backwards-compatible properties
    tier: state.isSubscribed ? 'pro' : null,
    billingPeriod: state.isSubscribed ? 'monthly' : null,
    discountPercent: state.isSubscribed ? ECLIPSE_PLUS_DISCOUNT : 0,
    freeProductsPerMonth: state.isSubscribed ? 1 : 0,
    checkSubscription,
    subscribe,
    openCustomerPortal,
    claimFreeProduct,
    getMemberPrice,
    getDiscountPercent,
    isEligibleForDiscount,
    isEligibleForFreeClaim,
  };
}
