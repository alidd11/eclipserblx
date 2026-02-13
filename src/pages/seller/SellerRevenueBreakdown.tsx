import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Package, DollarSign, Layers } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function SellerRevenueBreakdown() {
  const { store } = useSellerStatus();
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');

  const startDate = useMemo(() => subDays(new Date(), Number(period)), [period]);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['seller-revenue-breakdown', store?.id, period],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('seller_transactions')
        .select('*, order_items(product_id, products(name, category_id, categories(name)))')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Revenue by day
  const dailyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = Number(period) - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'MMM dd');
      map.set(d, 0);
    }
    transactions.forEach((t: any) => {
      const d = format(new Date(t.created_at), 'MMM dd');
      map.set(d, (map.get(d) || 0) + Number(t.net_amount || 0));
    });
    return Array.from(map, ([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }));
  }, [transactions, period]);

  // Revenue by product
  const byProduct = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t: any) => {
      const orderItem = Array.isArray(t.order_items) ? t.order_items[0] : t.order_items;
      const product = orderItem ? (Array.isArray(orderItem.products) ? orderItem.products[0] : orderItem.products) : null;
      const name = product?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + Number(t.net_amount || 0));
    });
    return Array.from(map, ([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [transactions]);

  // Revenue by category
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t: any) => {
      const orderItem = Array.isArray(t.order_items) ? t.order_items[0] : t.order_items;
      const product = orderItem ? (Array.isArray(orderItem.products) ? orderItem.products[0] : orderItem.products) : null;
      const category = product ? (Array.isArray(product.categories) ? product.categories[0] : product.categories) : null;
      const cat = category?.name || 'Uncategorised';
      map.set(cat, (map.get(cat) || 0) + Number(t.net_amount || 0));
    });
    return Array.from(map, ([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [transactions]);

  const totalRevenue = transactions.reduce((sum: number, t: any) => sum + Number(t.net_amount || 0), 0);
  const avgOrderValue = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <SellerLayout><div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Revenue Breakdown</h1>
          <p className="text-sm text-muted-foreground">Detailed view of your earnings by product, category, and time.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Net Revenue</p>
                <p className="text-xl font-bold">£{totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
                <p className="text-xl font-bold">£{avgOrderValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue over time */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue Over Time</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip formatter={(v: number) => [`£${v.toFixed(2)}`, 'Revenue']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Products by Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProduct} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => [`£${v.toFixed(2)}`, 'Revenue']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By category */}
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`£${v.toFixed(2)}`, 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No category data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div></SellerLayout>
  );
}
