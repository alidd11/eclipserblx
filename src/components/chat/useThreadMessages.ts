import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ChatMessage, ChatRoomConfig } from './chatHelpers';

export function useThreadMessages(config: ChatRoomConfig, parentMessageId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = [config.channelPrefix, 'thread', parentMessageId];
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: threadMessages = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!parentMessageId) return [];
      const { data, error } = await supabase
        .from(config.table as any)
        .select('id, user_id, message, attachment_url, created_at, edited_at, thread_parent_id, reply_to_id, is_pinned, pinned_by')
        .eq('thread_parent_id', parentMessageId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
    enabled: !!parentMessageId,
    // No polling — realtime subscription below handles updates
  });

  // Realtime subscription replaces 5s polling
  useEffect(() => {
    if (!parentMessageId) return;

    const channel = supabase
      .channel(`thread-${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: config.table,
          filter: `thread_parent_id=eq.${parentMessageId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: key });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [parentMessageId, config.table, config.channelPrefix, queryClient]);

  const sendThreadReply = useMutation({
    mutationFn: async ({ message, attachmentUrl }: { message: string; attachmentUrl: string | null }) => {
      if (!user?.id || !parentMessageId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(config.table as any)
        .insert({
          user_id: user.id,
          message: message.trim() || (attachmentUrl ? '📎 Attachment' : ''),
          attachment_url: attachmentUrl,
          thread_parent_id: parentMessageId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: [config.channelPrefix, 'messages'] });
    },
    onError: () => toast.error('Failed to send reply'),
  });

  return { threadMessages, isLoading, sendThreadReply };
}
