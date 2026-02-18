import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, BellOff, Check, CheckCheck, Trash2,
  ShoppingCart, RotateCcw, Heart, Package, Zap, Megaphone, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const NOTIFICATION_ICONS: Record<string, any> = {
  new_order: ShoppingCart,
  refund_request: RotateCcw,
  new_follower: Heart,
  product_approved: Package,
  product_rejected: Package,
  flash_sale_ended: Zap,
  announcement_expired: Megaphone,
  payout_completed: DollarSign,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  new_order: 'text-green-500',
  refund_request: 'text-orange-500',
  new_follower: 'text-pink-500',
  product_approved: 'text-green-500',
  product_rejected: 'text-destructive',
  flash_sale_ended: 'text-yellow-500',
  payout_completed: 'text-blue-500',
};

export default function SellerNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['seller-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('seller_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('seller-notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'seller_notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['seller-notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['seller-unread-count', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('seller_notifications')
        .update({ read_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['seller-unread-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('seller_notifications')
        .update({ read_at: new Date().toISOString() } as any)
        .eq('user_id', user.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['seller-unread-count'] });
      toast.success('All notifications marked as read');
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('seller_notifications')
        .delete()
        .eq('user_id', user.id)
        .not('read_at', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-notifications'] });
      toast.success('Read notifications cleared');
    },
  });

  const handleClick = (notification: any) => {
    if (!notification.read_at) {
      markAsRead.mutate(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const unreadCount = notifications?.filter((n: any) => !n.read_at).length || 0;

  return (
    <SellerLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
                <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => clearAll.mutate()}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear read
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((n: any) => {
              const Icon = NOTIFICATION_ICONS[n.type] || Bell;
              const colorClass = NOTIFICATION_COLORS[n.type] || 'text-muted-foreground';
              const isUnread = !n.read_at;

              return (
                <Card
                  key={n.id}
                  interactive
                  className={cn(
                    'transition-all',
                    isUnread && 'border-primary/30 bg-primary/5'
                  )}
                  onClick={() => handleClick(n)}
                >
                  <CardContent className="flex items-start gap-3 py-3 px-4">
                    <div className={cn('mt-0.5 shrink-0', colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-medium', isUnread && 'font-semibold')}>
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); markAsRead.mutate(n.id); }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You'll receive notifications here for new orders, refund requests, and more.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </SellerLayout>
  );
}
