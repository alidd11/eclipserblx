import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, PoundSterling, Download, TrendingUp, Calendar, FileDown, Lock } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, subDays, format } from 'date-fns';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { isAdmin } = useAdminAuth();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [products, orders, users, downloads] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, total, status'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('download_logs').select('id', { count: 'exact', head: true }),
      ]);

      const totalRevenue = orders.data?.filter(o => o.status === 'paid' || o.status === 'fulfilled')
        .reduce((sum, o) => sum + (o.total || 0), 0) ?? 0;

      const pendingOrders = orders.data?.filter(o => o.status === 'pending').length ?? 0;

      return {
        products: products.count ?? 0,
        orders: orders.data?.length ?? 0,
        users: users.count ?? 0,
        revenue: totalRevenue,
        pendingOrders,
        downloads: downloads.count ?? 0,
      };
    },
  });

  // Income breakdown query
  const { data: incomeBreakdown } = useQuery({
    queryKey: ['admin-income-breakdown'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .in('status', ['paid', 'fulfilled']);

      if (error) throw error;

      const now = new Date();
      const dayStart = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const yearStart = startOfYear(now);

      const paidOrders = orders ?? [];

      const daily = paidOrders
        .filter(o => isAfter(new Date(o.created_at), dayStart))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const weekly = paidOrders
        .filter(o => isAfter(new Date(o.created_at), weekStart))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const monthly = paidOrders
        .filter(o => isAfter(new Date(o.created_at), monthStart))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const yearly = paidOrders
        .filter(o => isAfter(new Date(o.created_at), yearStart))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      return { daily, weekly, monthly, yearly };
    },
  });

  // 30-day income trend query (admin only)
  const { data: incomeTrend } = useQuery({
    queryKey: ['admin-income-trend'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .in('status', ['paid', 'fulfilled'])
        .gte('created_at', subDays(new Date(), 30).toISOString());

      if (error) throw error;

      // Create a map for the last 30 days
      const dailyTotals: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyTotals[date] = 0;
      }

      // Sum up orders by day
      (orders ?? []).forEach((order) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (dailyTotals[date] !== undefined) {
          dailyTotals[date] += order.total || 0;
        }
      });

      return Object.entries(dailyTotals).map(([date, total]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        total,
      }));
    },
    enabled: isAdmin,
  });

  const exportIncomeReport = () => {
    if (!incomeTrend) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Income (£)'];
    const rows = incomeTrend.map((day) => [day.date, day.total.toFixed(2)]);
    
    // Add summary
    const totalIncome = incomeTrend.reduce((sum, day) => sum + day.total, 0);
    rows.push(['', '']);
    rows.push(['Total (30 days)', totalIncome.toFixed(2)]);
    rows.push(['Daily Average', (totalIncome / 30).toFixed(2)]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: productDownloads } = useQuery({
    queryKey: ['admin-product-downloads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, download_count, images')
        .order('download_count', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your store performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <PoundSterling className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{(stats?.revenue ?? 0).toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.orders ?? 0}</div>
              {stats?.pendingOrders ? (
                <p className="text-xs text-muted-foreground">{stats.pendingOrders} pending</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.products ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Downloads</CardTitle>
              <Download className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.downloads ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Orders */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-4">
                  {recentOrders?.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{order.customer_email}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">£{order.total.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                          order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download Stats by Product */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Top Downloaded Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productDownloads?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No downloads yet</p>
              ) : (
                <div className="space-y-4">
                  {productDownloads?.map((product, index) => (
                    <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      {product.images?.[0] && (
                        <img 
                          src={product.images[0]} 
                          alt={product.name} 
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                      </div>
                      <div className="flex items-center gap-1 text-primary font-bold">
                        <Download className="h-4 w-4" />
                        {product.download_count ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Income Breakdown Section - Visible to all staff */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Income Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-muted-foreground">Today</span>
                </div>
                <p className="text-2xl font-bold text-green-500">£{(incomeBreakdown?.daily ?? 0).toFixed(2)}</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-muted-foreground">This Week</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">£{(incomeBreakdown?.weekly ?? 0).toFixed(2)}</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-muted-foreground">This Month</span>
                </div>
                <p className="text-2xl font-bold text-purple-500">£{(incomeBreakdown?.monthly ?? 0).toFixed(2)}</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-muted-foreground">This Year</span>
                </div>
                <p className="text-2xl font-bold text-amber-500">£{(incomeBreakdown?.yearly ?? 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin-Only Income Analytics Section */}
        {isAdmin && (
          <Card className="bg-card border-border border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Income Analytics
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Admin Only</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportIncomeReport} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">30-Day Income Trend</h4>
                  <div className="h-[300px] w-full">
                    <ChartContainer
                      config={{
                        total: {
                          label: "Income",
                          color: "hsl(var(--primary))",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={incomeTrend ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="displayDate"
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tickFormatter={(value) => `£${value}`}
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => [`£${Number(value).toFixed(2)}`, 'Income']}
                              />
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>

                {incomeTrend && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">30-Day Total</p>
                      <p className="text-2xl font-bold text-primary">
                        £{incomeTrend.reduce((sum, day) => sum + day.total, 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Daily Average</p>
                      <p className="text-2xl font-bold">
                        £{(incomeTrend.reduce((sum, day) => sum + day.total, 0) / 30).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Best Day</p>
                      <p className="text-2xl font-bold text-green-500">
                        £{Math.max(...incomeTrend.map((day) => day.total)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
