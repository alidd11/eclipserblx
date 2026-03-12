import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserCheck, TrendingUp, Globe, ShoppingCart, Repeat } from 'lucide-react';

export default function SellerCustomerInsights() {
  const { store } = useSellerStatus();
  const [timeRange, setTimeRange] = useState('30d');

  const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  const { data, isLoading } = useQuery({
    queryKey: ['seller-customer-insights', store?.id, timeRange],
    queryFn: async () => {
      if (!store?.id) return null;

      const since = new Date(Date.now() - daysBack * 86400000).toISOString();

      // Get orders for this store's products
      const { data: transactions } = await supabase
        .from('seller_transactions')
        .select('order_id, buyer_id, gross_amount, created_at')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!transactions?.length) return { 
        totalCustomers: 0, repeatCustomers: 0, newCustomers: 0, 
        avgOrderValue: 0, topCustomers: [], countries: [] 
      };

      // Aggregate by buyer
      const buyerMap = new Map<string, { orders: number; total: number; lastOrder: string }>();
      transactions.forEach(tx => {
        const id = tx.buyer_id || 'anonymous';
        const existing = buyerMap.get(id);
        if (existing) {
          existing.orders++;
          existing.total += Number(tx.gross_amount || 0);
          if (tx.created_at > existing.lastOrder) existing.lastOrder = tx.created_at;
        } else {
          buyerMap.set(id, { orders: 1, total: Number(tx.gross_amount || 0), lastOrder: tx.created_at });
        }
      });

      const totalCustomers = buyerMap.size;
      const repeatCustomers = Array.from(buyerMap.values()).filter(b => b.orders > 1).length;
      const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.gross_amount || 0), 0);
      const avgOrderValue = transactions.length > 0 ? totalRevenue / transactions.length : 0;

      // Top customers by spend
      const topCustomers = Array.from(buyerMap.entries())
        .filter(([id]) => id !== 'anonymous')
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);

      // Get profiles for top customers
      const topIds = topCustomers.map(([id]) => id);
      let profiles: any[] = [];
      if (topIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', topIds);
        profiles = profileData || [];
      }

      // Get country data from analytics
      const { data: countryData } = await supabase
        .from('seller_analytics')
        .select('country')
        .eq('store_id', store.id)
        .eq('event_type', 'purchase')
        .gte('created_at', since)
        .limit(500);

      const countryMap = new Map<string, number>();
      countryData?.forEach(e => {
        const c = e.country || 'Unknown';
        countryMap.set(c, (countryMap.get(c) || 0) + 1);
      });

      const countries = Array.from(countryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      return {
        totalCustomers,
        repeatCustomers,
        newCustomers: totalCustomers - repeatCustomers,
        avgOrderValue,
        topCustomers: topCustomers.map(([id, data]) => {
          const profile = profiles.find(p => p.user_id === id);
          return {
            id,
            name: profile?.display_name || profile?.username || 'Anonymous',
            avatar: profile?.avatar_url,
            orders: data.orders,
            total: data.total,
            lastOrder: data.lastOrder,
          };
        }),
        countries,
      };
    },
    enabled: !!store?.id,
  });

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Customer Insights
            </h1>
            <p className="text-muted-foreground text-sm">Understand your buyers and grow your audience</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Total Customers</span>
                  </div>
                  <p className="text-2xl font-bold">{data?.totalCustomers || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Repeat className="h-4 w-4" />
                    <span className="text-xs">Repeat Buyers</span>
                  </div>
                  <p className="text-2xl font-bold">{data?.repeatCustomers || 0}</p>
                  {data && data.totalCustomers > 0 && (
                    <p className="text-xs text-primary">
                      {((data.repeatCustomers / data.totalCustomers) * 100).toFixed(0)}% return rate
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <UserCheck className="h-4 w-4" />
                    <span className="text-xs">New Customers</span>
                  </div>
                  <p className="text-2xl font-bold">{data?.newCustomers || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="text-xs">Avg Order Value</span>
                  </div>
                  <p className="text-2xl font-bold">£{(data?.avgOrderValue || 0).toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Top Customers
                  </CardTitle>
                  <CardDescription>By total spend</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.topCustomers?.length ? (
                    <div className="space-y-3">
                      {data.topCustomers.map((customer: any, i: number) => (
                        <div key={customer.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {customer.avatar ? (
                              <img src={customer.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">{customer.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.orders} order{customer.orders > 1 ? 's' : ''}</p>
                          </div>
                          <span className="text-sm font-bold">£{customer.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No customer data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Geographic Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Buyer Locations
                  </CardTitle>
                  <CardDescription>Where your customers are from</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.countries?.length ? (
                    <div className="space-y-2">
                      {data.countries.map((country: any) => {
                        const total = data.countries.reduce((s: number, c: any) => s + c.count, 0);
                        const pct = total > 0 ? (country.count / total) * 100 : 0;
                        return (
                          <div key={country.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{country.name}</span>
                              <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No location data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </SellerLayout>
  );
}
