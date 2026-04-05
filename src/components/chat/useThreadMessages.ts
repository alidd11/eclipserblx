import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ChatMessage, ChatRoomConfig } from './chatHelpers';

export function useThreadMessages(config: ChatRoomConfig, parentMessageId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = [config.channelPrefix, 'thread', parentMessageId];

  const { data: threadMessages = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!parentMessageId) return [];
      const { data, error } = await supabase
        .from(config.table as any)
        .select('*')
        .eq('thread_parent_id', parentMessageId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
    enabled: !!parentMessageId,
    refetchInterval: 5000,
  });

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
