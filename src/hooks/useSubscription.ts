import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// Bot category ID - products in this category are excluded from discounts and free claims
export const BOT_CATEGORY_ID = "852838dc-adb6-4154-93fe-d1814fe46263";

// Eclipse+ discount percentage for non-bot products
export const ECLIPSE_PLUS_DISCOUNT = 30;

interface SubscriptionState {
  isSubscribed: boolean;
  subscriptionEnd: string | null;
  subscriptionId: string | null;
  canClaimFree: boolean;
  claimedThisMonth: boolean;
  claimedProductId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    subscriptionEnd: null,
    subscriptionId: null,
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
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
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
  }, [user]);

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
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout');
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating subscription checkout:', error);
      throw error;
    }
  }, [user]);

  const openCustomerPortal = useCallback(async () => {
    if (!user) {
      throw new Error('You must be logged in to manage your subscription');
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  }, [user]);

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
  }, [user, state.isSubscribed, state.canClaimFree, checkSubscription, queryClient]);

  // Calculate member price for a product
  const getMemberPrice = useCallback((originalPrice: number, categoryId?: string | null): number => {
    // Bot products don't get the discount
    if (categoryId === BOT_CATEGORY_ID) {
      return originalPrice;
    }
    return originalPrice * (1 - ECLIPSE_PLUS_DISCOUNT / 100);
  }, []);

  // Check if a product is eligible for the discount
  const isEligibleForDiscount = useCallback((categoryId?: string | null): boolean => {
    return categoryId !== BOT_CATEGORY_ID;
  }, []);

  // Check if a product is eligible for free claim
  const isEligibleForFreeClaim = useCallback((categoryId?: string | null): boolean => {
    return categoryId !== BOT_CATEGORY_ID;
  }, []);

  return {
    ...state,
    checkSubscription,
    subscribe,
    openCustomerPortal,
    claimFreeProduct,
    getMemberPrice,
    isEligibleForDiscount,
    isEligibleForFreeClaim,
  };
}
