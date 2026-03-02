import { useEffect } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Subscribes to realtime seller_transactions inserts for the current store
 * and shows a toast + invalidates relevant queries on new sales.
 */
export function useRealtimeOrders() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!store?.id) return;

    const channel = supabase
      .channel(`seller-orders-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seller_transactions',
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const tx = payload.new as any;
          if (tx.type === 'sale') {
            const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(tx.net_amount || 0);
            toast.success('New Sale!', {
              description: `${tx.description || 'Product sold'} — ${amount} earned`,
            });

            // Invalidate dashboard queries
            queryClient.invalidateQueries({ queryKey: ['seller-revenue-summary'] });
            queryClient.invalidateQueries({ queryKey: ['seller-recent-orders-table'] });
            queryClient.invalidateQueries({ queryKey: ['seller-revenue-chart'] });
            queryClient.invalidateQueries({ queryKey: ['seller-top-products'] });
            queryClient.invalidateQueries({ queryKey: ['seller-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['seller-product-stats'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, queryClient]);
}
