import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  ShoppingCart, 
  Star, 
  DollarSign,
  MessageCircle,
  Package,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'order' | 'review' | 'payout' | 'message' | 'product';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

export function NotificationCenter() {
  const { store } = useSellerStatus();
  const [activeTab, setActiveTab] = useState('all');

  // Fetch recent activities
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['seller-notifications', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const results: Notification[] = [];

      // Recent orders
      const { data: orders } = await supabase
        .from('seller_transactions')
        .select('id, created_at, description, amount, status')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .order('created_at', { ascending: false })
        .limit(5);

      orders?.forEach(order => {
        results.push({
          id: `order-${order.id}`,
          type: 'order',
          title: 'New Order',
          description: order.description || 'Product sale',
          timestamp: new Date(order.created_at),
          read: true,
          link: '/seller/orders',
        });
      });

      // Recent reviews for store products
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', store.id);

      const productIds = products?.map(p => p.id) || [];

      if (productIds.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('id, created_at, rating, content, product_id')
          .in('product_id', productIds)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(5);

        reviews?.forEach(review => {
          results.push({
            id: `review-${review.id}`,
            type: 'review',
            title: `${review.rating}★ Review`,
            description: review.content?.substring(0, 60) + (review.content?.length > 60 ? '...' : ''),
            timestamp: new Date(review.created_at),
            read: true,
            link: '/seller/reviews',
          });
        });
      }

      // Recent payouts
      const { data: payouts } = await supabase
        .from('seller_payouts')
        .select('id, created_at, amount, status')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(3);

      payouts?.forEach(payout => {
        results.push({
          id: `payout-${payout.id}`,
          type: 'payout',
          title: payout.status === 'completed' ? 'Payout Complete' : 'Payout Pending',
          description: `£${payout.amount.toFixed(2)}`,
          timestamp: new Date(payout.created_at),
          read: true,
          link: '/seller/balance',
        });
      });

      // Recent messages (sender_type = 'customer' means customer sent it)
      const { data: messages } = await supabase
        .from('store_messages')
        .select('id, created_at, message, sender_type, is_read')
        .eq('store_id', store.id)
        .eq('sender_type', 'customer')
        .order('created_at', { ascending: false })
        .limit(3);

      (messages as any[])?.forEach((msg: any) => {
        results.push({
          id: `message-${msg.id}`,
          type: 'message',
          title: 'New Message',
          description: msg.message?.substring(0, 50) + (msg.message?.length > 50 ? '...' : ''),
          timestamp: new Date(msg.created_at),
          read: msg.is_read,
          link: '/seller/messages',
        });
      });

      // Sort by timestamp
      return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },
    enabled: !!store?.id,
  });

  const filteredNotifications = notifications?.filter(n => {
    if (activeTab === 'all') return true;
    return n.type === activeTab;
  }) || [];

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order': return ShoppingCart;
      case 'review': return Star;
      case 'payout': return DollarSign;
      case 'message': return MessageCircle;
      case 'product': return Package;
      default: return Bell;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'order': return 'text-blue-500 bg-blue-500/10';
      case 'review': return 'text-yellow-500 bg-yellow-500/10';
      case 'payout': return 'text-green-500 bg-green-500/10';
      case 'message': return 'text-purple-500 bg-purple-500/10';
      case 'product': return 'text-primary bg-primary/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Activity
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 border-b">
            <TabsList className="h-9 w-full justify-start bg-transparent p-0 gap-4">
              <TabsTrigger value="all" className="px-0 h-9 data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                All
              </TabsTrigger>
              <TabsTrigger value="order" className="px-0 h-9 data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Orders
              </TabsTrigger>
              <TabsTrigger value="review" className="px-0 h-9 data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Reviews
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-pulse text-muted-foreground">Loading...</div>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => {
                    const Icon = getIcon(notification.type);
                    const iconColor = getIconColor(notification.type);

                    return (
                      <Link
                        key={notification.id}
                        to={notification.link || '#'}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg transition-colors',
                          'hover:bg-muted/50',
                          !notification.read && 'bg-primary/5'
                        )}
                      >
                        <div className={cn('p-2 rounded-full shrink-0', iconColor)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm truncate">{notification.title}</p>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {notification.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No activity yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
