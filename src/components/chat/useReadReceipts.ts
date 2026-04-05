import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ReadReceipt {
  user_id: string;
  channel: string;
  last_read_message_id: string | null;
  last_read_at: string;
}

export function useReadReceipts(channel: string, latestMessageId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['read-receipts', channel];

  const { data: receipts = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_read_receipts')
        .select('*')
        .eq('channel', channel);
      if (error) throw error;
      return (data || []) as ReadReceipt[];
    },
    refetchInterval: 10000,
  });

  const markAsRead = useCallback(async () => {
    if (!user?.id || !latestMessageId) return;
    const { error } = await supabase
      .from('chat_read_receipts')
      .upsert(
        {
          user_id: user.id,
          channel,
          last_read_message_id: latestMessageId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,channel' }
      );
    if (!error) queryClient.invalidateQueries({ queryKey: key });
  }, [user?.id, latestMessageId, channel]);

  // Auto-mark as read when document is visible
  useEffect(() => {
    if (!document.hidden && latestMessageId) markAsRead();
  }, [latestMessageId, markAsRead]);

  useEffect(() => {
    const handler = () => { if (!document.hidden) markAsRead(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [markAsRead]);

  const getReadByUsers = useCallback((messageId: string) => {
    return receipts.filter(r =>
      r.last_read_message_id === messageId && r.user_id !== user?.id
    );
  }, [receipts, user?.id]);

  const getLastReadUsers = useCallback(() => {
    return receipts.filter(r => r.user_id !== user?.id);
  }, [receipts, user?.id]);

  return { receipts, markAsRead, getReadByUsers, getLastReadUsers };
}
