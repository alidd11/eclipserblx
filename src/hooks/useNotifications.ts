import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

// Singleton-like: all consumers share the same realtime channel via this hook + React Query-like dedup
let globalChannelActive = false;

export function useNotifications() {
  const { user } = useAuth();
  const { playSound } = useNotificationSound();
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: true,
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setState({
        notifications: data,
        unreadCount: data.filter((n) => !n.is_read).length,
        isLoading: false,
      });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setState({ notifications: [], unreadCount: 0, isLoading: false });
      return;
    }

    fetchNotifications();

    // Unique channel name per mount to avoid re-subscribing a cached channel
    // (Supabase throws "cannot add postgres_changes callbacks after subscribe()"
    // if .channel(name) returns an already-subscribed instance.)
    const channelName = `notifications-unified-${user.id}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setState(prev => ({
              notifications: [newNotification, ...prev.notifications].slice(0, 20),
              unreadCount: prev.unreadCount + 1,
              isLoading: false,
            }));

            // Play sound and browser notification
            playSound();
            if ('Notification' in window && window.Notification.permission === 'granted' && document.hidden) {
              new window.Notification(newNotification.title, {
                body: newNotification.message,
                tag: `notification-${newNotification.id}`,
                icon: '/favicon.ico',
              });
            }
          } else {
            // UPDATE or DELETE — just refetch
            fetchNotifications();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  }, [user]);

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
