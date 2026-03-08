import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { safeStorage } from '@/lib/safeStorage';

interface ChatNotifications {
  staffMessagesUnread: boolean;
  staffMessagesMention: boolean;
  adminChatUnread: boolean;
  adminChatMention: boolean;
}

/**
 * Chat notifications hook — only subscribes to realtime channels when `enabled` is true.
 * Pass enabled=true only on admin pages to avoid wasting realtime connections for regular users.
 */
export function useChatNotifications(enabled = true): ChatNotifications {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ChatNotifications>({
    staffMessagesUnread: false,
    staffMessagesMention: false,
    adminChatUnread: false,
    adminChatMention: false,
  });

  useEffect(() => {
    if (!user || !enabled) return;

    const checkNotifications = async () => {
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const [{ data: staffMessages }, { data: adminMessages }, { data: profile }] = await Promise.all([
          supabase
            .from('staff_chat_messages')
            .select('id, message, user_id, created_at')
            .gte('created_at', oneDayAgo)
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('admin_chat_messages')
            .select('id, message, user_id, created_at')
            .gte('created_at', oneDayAgo)
            .neq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('profiles')
            .select('display_name, email')
            .eq('user_id', user.id)
            .single(),
        ]);

        const staffLastRead = safeStorage.getItem(`staff-chat-last-read-${user.id}`);
        const adminLastRead = safeStorage.getItem(`admin-chat-last-read-${user.id}`);
        const staffLastReadTime = staffLastRead ? new Date(staffLastRead) : new Date(0);
        const adminLastReadTime = adminLastRead ? new Date(adminLastRead) : new Date(0);

        const staffUnreadMessages = staffMessages?.filter(
          msg => new Date(msg.created_at) > staffLastReadTime
        ) || [];
        
        const adminUnreadMessages = adminMessages?.filter(
          msg => new Date(msg.created_at) > adminLastReadTime
        ) || [];

        const userMentionPatterns = [
          `@${user.email}`,
          profile?.display_name ? `@${profile.display_name}` : null,
        ].filter(Boolean) as string[];

        const checkForMention = (message: string) => {
          const lowerMessage = message.toLowerCase();
          return userMentionPatterns.some(pattern => 
            lowerMessage.includes(pattern.toLowerCase())
          );
        };

        const staffHasMention = staffUnreadMessages.some(msg => checkForMention(msg.message));
        const adminHasMention = adminUnreadMessages.some(msg => checkForMention(msg.message));

        setNotifications({
          staffMessagesUnread: staffUnreadMessages.length > 0,
          staffMessagesMention: staffHasMention,
          adminChatUnread: adminUnreadMessages.length > 0,
          adminChatMention: adminHasMention,
        });
      } catch (error) {
        console.error('Error checking chat notifications:', error);
      }
    };

    checkNotifications();

    // Single realtime channel instead of two separate ones
    const channel = supabase
      .channel('staff-admin-chat-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_chat_messages' },
        () => checkNotifications()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_chat_messages' },
        () => checkNotifications()
      )
      .subscribe();

    // Re-check periodically — relaxed to 60s (was 30s)
    const interval = setInterval(checkNotifications, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, enabled]);

  return notifications;
}

// Helper function to mark messages as read
export function markChatAsRead(chatType: 'staff' | 'admin', userId: string) {
  const key = chatType === 'staff' 
    ? `staff-chat-last-read-${userId}` 
    : `admin-chat-last-read-${userId}`;
  safeStorage.setItem(key, new Date().toISOString());
}
