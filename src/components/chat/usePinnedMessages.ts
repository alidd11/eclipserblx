import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ChatMessage, ChatRoomConfig } from './chatHelpers';

export function usePinnedMessages(config: ChatRoomConfig) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = [config.channelPrefix, 'pinned'];

  const { data: pinnedMessages = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(config.table as any)
        .select('*')
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(config.table as any)
        .update({
          is_pinned: !isPinned,
          pinned_by: !isPinned ? user.id : null,
        })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: (_, { isPinned }) => {
      toast.success(isPinned ? 'Message unpinned' : 'Message pinned');
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: [config.channelPrefix, 'messages'] });
    },
  });

  return { pinnedMessages, isLoading, togglePin };
}
