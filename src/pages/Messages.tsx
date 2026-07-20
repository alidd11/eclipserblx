import { useState, useEffect, useMemo } from 'react';
import { Bell, Award, Tag, ShoppingCart, MessageCircle, Trophy, Percent, CheckCheck, Inbox, Filter, ChevronRight, Shield } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { hapticTap } from '@/lib/haptics';
import { usePageMeta } from '@/hooks/usePageMeta';
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

type FilterType = 'all' | 'unread' | 'orders' | 'system';

const NOTIFICATION_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  badge_earned: { icon: <Award className="h-4 w-4 text-warning" />, label: 'Achievement' },
  discount_code: { icon: <Percent className="h-4 w-4 text-success" />, label: 'Promotion' },
  milestone: { icon: <Trophy className="h-4 w-4 text-accent" />, label: 'Milestone' },
  order_update: { icon: <ShoppingCart className="h-4 w-4 text-primary" />, label: 'Order' },
  new_product: { icon: <Tag className="h-4 w-4 text-primary" />, label: 'Product' },
  leak_detected: { icon: <Shield className="h-4 w-4 text-destructive" />, label: 'Security' },
  system: { icon: <MessageCircle className="h-4 w-4 text-muted-foreground" />, label: 'System' },
};

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'orders', label: 'Orders' },
  { value: 'system', label: 'System' },
];

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, Notification[]> = {};
  const order: string[] = [];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    let label: string;
    if (d >= today) label = 'Today';
    else if (d >= yesterday) label = 'Yesterday';
    else if (d >= weekAgo) label = 'This Week';
    else label = 'Earlier';

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(n);
  }

  return order.map(label => ({ label, items: groups[label] }));
}

export default function Messages() {
  usePageMeta({ title: 'Notifications', description: 'View your Eclipse notifications, order updates and badge awards.', canonicalPath: '/messages' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playSound } = useNotificationSound();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchNotifications();

    const channel = supabase
      .channel(`messages-page-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          fetchNotifications();
          playSound();
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('New Message', {
              body: 'You have a new notification',
              tag: 'messages-page-update',
              icon: '/favicon.ico',
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, navigate]);

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) setNotifications(data);
    setIsLoading(false);
  };

  const markAsRead = async (id: string) => {
    hapticTap();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    hapticTap();
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    hapticTap();
    if (!notification.is_read) markAsRead(notification.id);
    if (notification.link) {
      const isAdminLink = notification.link.startsWith('/admin');
      navigate(isAdminLink ? '/account' : notification.link);
    }
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case 'unread': return notifications.filter(n => !n.is_read);
      case 'orders': return notifications.filter(n => n.type === 'order_update');
      case 'system': return notifications.filter(n => ['system', 'milestone', 'badge_earned'].includes(n.type));
      default: return notifications;
    }
  }, [notifications, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  if (!user) return null;

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? <>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</>
                : 'You\u2019re all caught up'
              }
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { hapticTap(); setFilter(f.value); }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                filter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
              {f.value === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 tabular-nums">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        {isLoading ? (
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-border rounded-xl">
            <EmptyState
              icon={Inbox}
              title={filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
              description={filter === 'all'
                ? "You\u2019ll receive notifications about orders, badges, discounts, and more here."
                : 'Try switching to a different filter.'
              }
              actionLabel={filter !== 'all' ? 'View All' : 'Browse Products'}
              {...(filter !== 'all'
                ? { actionOnClick: () => setFilter('all') }
                : { actionTo: '/products' }
              )}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(group => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
                  {group.label}
                </p>
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {group.items.map(notification => {
                    const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.system;
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted flex items-center gap-3',
                          !notification.is_read && 'bg-primary/[0.03]'
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
                          !notification.is_read ? 'bg-primary/10' : 'bg-muted/50'
                        )}>
                          {config.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              'text-sm truncate',
                              !notification.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                            )}>
                              {notification.title}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {notification.message}
                          </p>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] text-muted-foreground/60 tabular-nums whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })}
                          </span>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
