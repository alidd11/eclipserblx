import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUnreadChatMessages(isPanelOpen: boolean) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(null);

  // Load last read timestamp from localStorage
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`chat_last_read_${user.id}`);
    setLastReadTimestamp(stored);
  }, [user]);

  // Mark as read when panel opens
  useEffect(() => {
    if (isPanelOpen && user) {
      const now = new Date().toISOString();
      localStorage.setItem(`chat_last_read_${user.id}`, now);
      setLastReadTimestamp(now);
      setUnreadCount(0);
    }
  }, [isPanelOpen, user]);

  // Fetch unread count
  useEffect(() => {
    if (!user || isPanelOpen) return;

    const fetchUnreadCount = async () => {
      try {
        // Get user's active conversation
        const { data: conversation } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conversation) {
          setUnreadCount(0);
          return;
        }

        // Count unread staff messages
        let query = supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('sender_type', 'agent');

        if (lastReadTimestamp) {
          query = query.gt('created_at', lastReadTimestamp);
        }

        const { count } = await query;
        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
  }, [user, lastReadTimestamp, isPanelOpen]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user || isPanelOpen) return;

    const channel = supabase
      .channel('chat_unread_counter')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMsg = payload.new as { sender_type: string; conversation_id: string };
          
          // Only count agent messages
          if (newMsg.sender_type !== 'agent') return;
          
          // Verify it's for the user's conversation
          const { data: conversation } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('id', newMsg.conversation_id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (conversation) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isPanelOpen]);

  return { unreadCount };
}
