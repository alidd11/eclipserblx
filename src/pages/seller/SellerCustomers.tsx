import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Heart, ShoppingCart, TrendingUp, Search, 
  UserCheck, Calendar, ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';

export default function SellerCustomers() {
  const { store } = useSellerStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('followers');

  // Fetch followers
  const { data: followers, isLoading: followersLoading } = useQuery({
    queryKey: ['seller-followers', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('store_follows')
        .select('id, user_id, created_at, notify_new_products, notify_discounts')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch profile info for followers
      const userIds = (data || []).map(f => f.user_id);
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', userIds);
      
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return (data || []).map(f => ({ ...f, profile: profileMap[f.user_id] || null }));
    },
    enabled: !!store?.id,
  });

  // Fetch repeat buyers (customers who ordered 2+ times from this store)
  const { data: repeatBuyers, isLoading: buyersLoading } = useQuery({
    queryKey: ['seller-repeat-buyers', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('seller_transactions')
        .select('order_id, created_at')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null);
      if (error) throw error;
      
      // Get order user_ids
      const orderIds = [...new Set((data || []).map(t => t.order_id))];
      if (orderIds.length === 0) return [];
      
      const { data: orders } = await supabase
        .from('orders')
        .select('id, user_id')
        .in('id', orderIds)
        .not('user_id', 'is', null);
      
      // Count per user
      const userOrderCount: Record<string, { count: number; lastOrder: string }> = {};
      (orders || []).forEach(o => {
        if (!o.user_id) return;
        if (!userOrderCount[o.user_id]) {
          userOrderCount[o.user_id] = { count: 0, lastOrder: '' };
        }
        userOrderCount[o.user_id].count++;
        const txDate = (data || []).find(t => t.order_id === o.id)?.created_at || '';
        if (txDate > userOrderCount[o.user_id].lastOrder) {
          userOrderCount[o.user_id].lastOrder = txDate;
        }
      });
      
      // Filter 2+ orders
      const repeatUserIds = Object.entries(userOrderCount)
        .filter(([, v]) => v.count >= 2)
        .map(([uid]) => uid);
      
      if (repeatUserIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', repeatUserIds);
      
      return (profiles || []).map(p => ({
        ...p,
        orderCount: userOrderCount[p.user_id]?.count || 0,
        lastOrder: userOrderCount[p.user_id]?.lastOrder || '',
      })).sort((a, b) => b.orderCount - a.orderCount);
    },
    enabled: !!store?.id,
  });

  const filteredFollowers = (followers || []).filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return f.profile?.display_name?.toLowerCase().includes(q) || 
           f.profile?.username?.toLowerCase().includes(q);
  });

  const filteredBuyers = (repeatBuyers || []).filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.display_name?.toLowerCase().includes(q) || 
           b.username?.toLowerCase().includes(q);
  });

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            View your followers and repeat buyers
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible">
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Heart className="h-4 w-4" />
                <span className="text-sm">Followers</span>
              </div>
              <p className="text-2xl font-bold">{store?.follower_count || 0}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <UserCheck className="h-4 w-4" />
                <span className="text-sm">Repeat Buyers</span>
              </div>
              <p className="text-2xl font-bold">{repeatBuyers?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Notification Opt-in</span>
              </div>
              <p className="text-2xl font-bold">
                {(followers || []).filter(f => f.notify_new_products || f.notify_discounts).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="sm:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="followers">Followers</SelectItem>
                <SelectItem value="repeat-buyers">Repeat Buyers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden sm:inline-flex mb-4">
            <TabsTrigger value="followers">Followers ({followers?.length || 0})</TabsTrigger>
            <TabsTrigger value="repeat-buyers">Repeat Buyers ({repeatBuyers?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="followers">
            {followersLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : filteredFollowers.length > 0 ? (
              <div className="space-y-2">
                {filteredFollowers.map(f => (
                  <Card key={f.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {(f.profile?.display_name || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{f.profile?.display_name || 'Unknown'}</p>
                          {f.profile?.username && (
                            <p className="text-sm text-muted-foreground">@{f.profile.username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.notify_new_products && <Badge variant="outline" className="text-xs">Products</Badge>}
                        {f.notify_discounts && <Badge variant="outline" className="text-xs">Discounts</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(f.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Followers Yet</h3>
                  <p className="text-muted-foreground">
                    Customers can follow your store to get notified about new products and sales.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="repeat-buyers">
            {buyersLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : filteredBuyers.length > 0 ? (
              <div className="space-y-2">
                {filteredBuyers.map(b => (
                  <Card key={b.user_id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {(b.display_name || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{b.display_name || 'Unknown'}</p>
                          {b.username && (
                            <p className="text-sm text-muted-foreground">@{b.username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{b.orderCount} orders</Badge>
                        <span className="text-xs text-muted-foreground">
                          Last: {format(new Date(b.lastOrder), 'MMM d')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Repeat Buyers Yet</h3>
                  <p className="text-muted-foreground">
                    Customers who purchase from your store multiple times will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
}
