import { useState, useEffect } from 'react';
import { Bell, Award, Tag, ShoppingCart, MessageCircle, Trophy, Percent, Check, CheckCheck } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { hapticTap } from '@/lib/haptics';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const notificationIcons: Record<string, React.ReactNode> = {
  badge_earned: <Award className="h-5 w-5 text-yellow-500" />,
  discount_code: <Percent className="h-5 w-5 text-green-500" />,
  forum_milestone: <Trophy className="h-5 w-5 text-purple-500" />,
  order_update: <ShoppingCart className="h-5 w-5 text-blue-500" />,
  system: <MessageCircle className="h-5 w-5 text-muted-foreground" />,
};

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('messages-page-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
    setIsLoading(false);
  };

  const markAsRead = async (id: string) => {
    hapticTap();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    hapticTap();

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    hapticTap();
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      // Redirect admin links to /account on customer site
      const isAdminLink = notification.link.startsWith('/admin');
      const safeLink = isAdminLink ? '/account' : notification.link;
      navigate(safeLink);
    }
  };

  if (!user) return null;

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* iOS-style header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <EclipseLogo size="sm" />
          <h1 className="text-lg font-semibold">My Messages</h1>
        </div>

        {/* Actions bar */}
        {unreadCount > 0 && (
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary hover:text-primary/80"
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all as read
            </Button>
          </div>
        )}

        {/* Notifications list */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-sm">Loading messages...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1 text-center px-4">
                You'll receive notifications about orders, badges, discounts, and more here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full px-4 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted',
                    !notification.is_read && 'bg-primary/5'
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {notificationIcons[notification.type] || (
                        <Bell className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            !notification.is_read && 'text-primary'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
