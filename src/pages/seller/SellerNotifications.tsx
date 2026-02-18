import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, BellOff, Check, CheckCheck, Trash2,
  ShoppingCart, RotateCcw, Heart, Package, Zap, Megaphone, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

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
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['seller-notifications', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('seller_notifications')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!store?.id) return;
    const channel = supabase
      .channel('seller-notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'seller_notifications',
        filter: `store_id=eq.${store.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['seller-notifications', store.id] });
        queryClient.invalidateQueries({ queryKey: ['seller-unread-count', store.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [store?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('seller_notifications')
        .update({ is_read: true })
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
      if (!store?.id) return;
      const { error } = await supabase
        .from('seller_notifications')
        .update({ is_read: true })
        .eq('store_id', store.id)
        .eq('is_read', false);
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
      if (!store?.id) return;
      const { error } = await supabase
        .from('seller_notifications')
        .delete()
        .eq('store_id', store.id)
        .eq('is_read', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-notifications'] });
      toast.success('Read notifications cleared');
    },
  });

  const handleClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

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

              return (
                <Card
                  key={n.id}
                  interactive
                  className={cn(
                    'transition-all',
                    !n.is_read && 'border-primary/30 bg-primary/5'
                  )}
                  onClick={() => handleClick(n)}
                >
                  <CardContent className="flex items-start gap-3 py-3 px-4">
                    <div className={cn('mt-0.5 shrink-0', colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-medium', !n.is_read && 'font-semibold')}>
                          {n.title}
                        </p>
                        {!n.is_read && (
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
                    {!n.is_read && (
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
