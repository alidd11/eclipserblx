import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export function useSellerUnreadCount() {
  const { user } = useAuth();

  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ['seller-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('seller_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Realtime subscription for live updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('seller-unread-bell')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'seller_notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refetch]);

  return unreadCount;
}
