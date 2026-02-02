import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'gift' | 'spend' | 'refund' | 'subscription_bonus';
  description: string | null;
  reference_id: string | null;
  gifted_by: string | null;
  order_id: string | null;
  created_at: string;
}

interface CreditState {
  balance: number;
  totalPurchased: number;
  totalGifted: number;
  totalSpent: number;
  eclipsePlusBonusClaimed: boolean;
  transactions: CreditTransaction[];
  isLoading: boolean;
  error: string | null;
}

export function useCredits() {
  const { user, session } = useAuth();
  const [state, setState] = useState<CreditState>({
    balance: 0,
    totalPurchased: 0,
    totalGifted: 0,
    totalSpent: 0,
    eclipsePlusBonusClaimed: false,
    transactions: [],
    isLoading: true,
    error: null,
  });

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setState({
        balance: 0,
        totalPurchased: 0,
        totalGifted: 0,
        totalSpent: 0,
        eclipsePlusBonusClaimed: false,
        transactions: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('get-credit-balance', {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setState({
        balance: data.balance || 0,
        totalPurchased: data.total_purchased || 0,
        totalGifted: data.total_gifted || 0,
        totalSpent: data.total_spent || 0,
        eclipsePlusBonusClaimed: data.eclipse_plus_bonus_claimed || false,
        transactions: data.transactions || [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch credit balance',
      }));
    }
  }, [user, session]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const purchaseCredits = useCallback(async (amount: number) => {
    if (!user) {
      throw new Error('You must be logged in to purchase credits');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-credit-checkout', {
        body: { amount },
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
      console.error('Error creating credit checkout:', error);
      throw error;
    }
  }, [user, session]);

  // Check if user can pay for a product with credits
  const canPayWithCredits = useCallback((productPrice: number): boolean => {
    return state.balance >= productPrice;
  }, [state.balance]);

  // Purchase products using credits
  const purchaseWithCredits = useCallback(async (items: Array<{ id: string; name: string; price: number }>): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to use credits' };
    }

    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
    if (state.balance < totalPrice) {
      return { success: false, error: `Insufficient credit balance. Required: £${totalPrice.toFixed(2)}, Available: £${state.balance.toFixed(2)}` };
    }

    try {
      const { data, error } = await supabase.functions.invoke('purchase-with-credits', {
        body: { items },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Refresh balance after purchase
      await fetchBalance();
      
      return { success: true, orderId: data.orderId };
    } catch (error) {
      console.error('Error purchasing with credits:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete credit purchase' 
      };
    }
  }, [user, session, state.balance, fetchBalance]);

  return {
    ...state,
    fetchBalance,
    purchaseCredits,
    canPayWithCredits,
    purchaseWithCredits,
  };
}
