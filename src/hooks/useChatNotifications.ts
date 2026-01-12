import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChatNotifications {
  staffMessagesUnread: boolean;
  staffMessagesMention: boolean;
  adminChatUnread: boolean;
  adminChatMention: boolean;
}

export function useChatNotifications(): ChatNotifications {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ChatNotifications>({
    staffMessagesUnread: false,
    staffMessagesMention: false,
    adminChatUnread: false,
    adminChatMention: false,
  });

  useEffect(() => {
    if (!user) return;

    const checkNotifications = async () => {
      try {
        // Get the user's last seen timestamp for staff messages
        // We'll use a simple approach: check messages from the last 24 hours
        // that the user hasn't sent themselves
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Check staff messages for unread and mentions
        const { data: staffMessages } = await supabase
          .from('staff_chat_messages')
          .select('id, message, user_id, created_at')
          .gte('created_at', oneDayAgo)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Check admin messages for unread and mentions
        const { data: adminMessages } = await supabase
          .from('admin_chat_messages')
          .select('id, message, user_id, created_at')
          .gte('created_at', oneDayAgo)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Get last read timestamps from localStorage
        const staffLastRead = localStorage.getItem(`staff-chat-last-read-${user.id}`);
        const adminLastRead = localStorage.getItem(`admin-chat-last-read-${user.id}`);

        const staffLastReadTime = staffLastRead ? new Date(staffLastRead) : new Date(0);
        const adminLastReadTime = adminLastRead ? new Date(adminLastRead) : new Date(0);

        // Check for unread messages (messages after last read time)
        const staffUnreadMessages = staffMessages?.filter(
          msg => new Date(msg.created_at) > staffLastReadTime
        ) || [];
        
        const adminUnreadMessages = adminMessages?.filter(
          msg => new Date(msg.created_at) > adminLastReadTime
        ) || [];

        // Check for @mentions - look for @displayName or @email patterns
        // We need to get the user's profile to check for their display name
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('user_id', user.id)
          .single();

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

    // Subscribe to real-time updates for both tables
    const staffChannel = supabase
      .channel('staff-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_chat_messages',
        },
        () => checkNotifications()
      )
      .subscribe();

    const adminChannel = supabase
      .channel('admin-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_chat_messages',
        },
        () => checkNotifications()
      )
      .subscribe();

    // Re-check periodically in case localStorage changes from another tab
    const interval = setInterval(checkNotifications, 30000);

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(adminChannel);
      clearInterval(interval);
    };
  }, [user]);

  return notifications;
}

// Helper function to mark messages as read
export function markChatAsRead(chatType: 'staff' | 'admin', userId: string) {
  const key = chatType === 'staff' 
    ? `staff-chat-last-read-${userId}` 
    : `admin-chat-last-read-${userId}`;
  localStorage.setItem(key, new Date().toISOString());
}
