import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, UserPlus, MessageCircle, Package, Star, Activity } from 'lucide-react';
import { formatRelative } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatGBP } from '@/lib/formatters';

interface FeedItem {
 id: string;
 type: 'order' | 'signup' | 'ticket' | 'product' | 'review';
 title: string;
 subtitle: string;
 time: string;
 icon: React.ElementType;
 color: string;
}

export function ActivityFeed() {
 const { data: feedItems, isLoading } = useQuery({
 queryKey: ['admin-activity-feed'],
 queryFn: async () => {
 const items: FeedItem[] = [];

 const [recentOrders, recentUsers, recentTickets, recentProducts, recentReviews] = await Promise.all([
 supabase.from('orders').select('id, created_at, status, total, user_id')
 .order('created_at', { ascending: false }).limit(5),
 supabase.from('profiles').select('user_id, display_name, customer_id, created_at')
 .order('created_at', { ascending: false }).limit(5),
 supabase.from('support_tickets').select('id, ticket_number, subject, created_at, status')
 .order('created_at', { ascending: false }).limit(5),
 supabase.from('products').select('id, name, created_at, moderation_status')
 .order('created_at', { ascending: false }).limit(5),
 supabase.from('reviews').select('id, created_at, rating')
 .order('created_at', { ascending: false }).limit(3),
 ]);

 // Resolve customer_ids for order users
 const orderUserIds = (recentOrders.data?.map(o => o.user_id).filter(Boolean) || []) as string[];
 let orderCustomerMap: Record<string, string> = {};
 if (orderUserIds.length > 0) {
 const { data: orderProfiles } = await supabase
 .from('profiles')
 .select('user_id, customer_id')
 .in('user_id', orderUserIds);
 orderProfiles?.forEach(p => {
 if (p.customer_id) orderCustomerMap[p.user_id] = p.customer_id;
 });
 }

 recentOrders.data?.forEach(o => items.push({
 id: `order-${o.id}`,
 type: 'order',
 title: `New order — ${formatGBP((o.total || 0))}`,
 subtitle: (o.user_id && orderCustomerMap[o.user_id]) || 'Guest checkout',
 time: o.created_at,
 icon: ShoppingCart,
 color: 'text-blue-500' }));

 recentUsers.data?.forEach(u => items.push({
 id: `user-${u.user_id}`,
 type: 'signup',
 title: u.display_name || 'New user',
 subtitle: u.customer_id || 'Signed up',
 time: u.created_at,
 icon: UserPlus,
 color: 'text-green-500' }));

 recentTickets.data?.forEach(t => items.push({
 id: `ticket-${t.id}`,
 type: 'ticket',
 title: t.subject || t.ticket_number || 'Support ticket',
 subtitle: `Status: ${t.status}`,
 time: t.created_at,
 icon: MessageCircle,
 color: 'text-orange-500' }));

 recentProducts.data?.forEach(p => items.push({
 id: `product-${p.id}`,
 type: 'product',
 title: p.name,
 subtitle: `Status: ${p.moderation_status}`,
 time: p.created_at,
 icon: Package,
 color: 'text-primary' }));

 recentReviews.data?.forEach(r => items.push({
 id: `review-${r.id}`,
 type: 'review',
 title: `New ${r.rating}★ review`,
 subtitle: 'Product review submitted',
 time: r.created_at,
 icon: Star,
 color: 'text-yellow-500' }));

 // Sort by time descending and take top 12
 return items
 .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
 .slice(0, 12);
 },
 refetchInterval: 5 * 60_000, // 5 minutes (reduced from 1 min)
 staleTime: 2 * 60_000 });

 if (isLoading) {
 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
 <h3 className="font-semibold text-sm text-base font-medium">Recent Activity</h3>
 </div>
 <div className="p-4">
 <div className="space-y-3">
 {[...Array(5)].map((_, i) => (
 <div key={i} className="flex items-center gap-3">
 <Skeleton className="h-8 w-8 rounded-full" />
 <div className="flex-1">
 <Skeleton className="h-4 w-32 mb-1" />
 <Skeleton className="h-3 w-20" />
 </div>
 <Skeleton className="h-3 w-16" />
 </div>
 ))}
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
 <h3 className="font-semibold text-sm flex items-center gap-2 text-base font-medium">
 <Activity className="h-4 w-4" />
 Recent Activity
 </h3>
 </div>
 <div className="p-4 pt-0">
 <ScrollArea className="h-[360px]">
 <div className="space-y-1">
 {feedItems?.map((item) => (
 <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
 <div className={cn('p-1.5 rounded-full bg-muted')}>
 <item.icon className={cn('h-3.5 w-3.5', item.color)} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">{item.title}</p>
 <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
 </div>
 <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
 {formatRelative(item.time)}
 </span>
 </div>
 ))}
 {(!feedItems || feedItems.length === 0) && (
 <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
 )}
 </div>
 </ScrollArea>
 </div>
 </div>
 );
}
