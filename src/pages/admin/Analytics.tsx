import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, Download, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function AdminAnalytics() {
  const { data: stats } = useQuery({
    queryKey: ['admin-analytics-stats'],
    queryFn: async () => {
      const [products, orders, users, downloads] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, status'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('download_logs').select('id', { count: 'exact', head: true }),
      ]);

      const pendingOrders = orders.data?.filter(o => o.status === 'pending').length ?? 0;
      const completedOrders = orders.data?.filter(o => o.status === 'completed').length ?? 0;

      return {
        products: products.count ?? 0,
        orders: orders.data?.length ?? 0,
        users: users.count ?? 0,
        pendingOrders,
        completedOrders,
        downloads: downloads.count ?? 0,
      };
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

  // Downloads over last 7 days
  const { data: downloadTrend } = useQuery({
    queryKey: ['admin-download-trend'],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const { count } = await supabase
          .from('download_logs')
          .select('id', { count: 'exact', head: true })
          .gte('downloaded_at', start)
          .lte('downloaded_at', end);
        
        days.push({
          date: format(date, 'EEE'),
          downloads: count ?? 0,
        });
      }
      return days;
    },
  });

  // Orders over last 7 days
  const { data: orderTrend } = useQuery({
    queryKey: ['admin-order-trend'],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end);
        
        days.push({
          date: format(date, 'EEE'),
          orders: count ?? 0,
        });
      }
      return days;
    },
  });

  // Category distribution
  const { data: categoryStats } = useQuery({
    queryKey: ['admin-category-stats'],
    queryFn: async () => {
      const { data: products } = await supabase
        .from('products')
        .select('category_id, categories(name)');
      
      const categoryCount: Record<string, number> = {};
      products?.forEach(p => {
        const name = (p.categories as { name: string } | null)?.name || 'Uncategorized';
        categoryCount[name] = (categoryCount[name] || 0) + 1;
      });
      
      return Object.entries(categoryCount).map(([name, value]) => ({ name, value }));
    },
  });

  // User registrations over last 7 days
  const { data: userTrend } = useQuery({
    queryKey: ['admin-user-trend'],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end);
        
        days.push({
          date: format(date, 'EEE'),
          users: count ?? 0,
        });
      }
      return days;
    },
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const chartConfig = {
    downloads: { label: 'Downloads', color: 'hsl(var(--primary))' },
    orders: { label: 'Orders', color: 'hsl(var(--chart-2))' },
    users: { label: 'Users', color: 'hsl(var(--chart-3))' },
  };

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl sm:text-3xl font-display">Analytics</CardTitle>
            <p className="text-muted-foreground text-sm">Detailed performance metrics and insights</p>
          </CardHeader>
        </Card>

        {/* Combined Overview Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.orders ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  {stats?.pendingOrders ?? 0} pending · {stats?.completedOrders ?? 0} completed
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.products ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.users ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.downloads ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Downloads</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Downloads Trend */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Downloads (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={downloadTrend || []}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="downloads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Orders Trend */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Orders (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <LineChart data={orderTrend || []}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* User Registrations */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                New Users (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={userTrend || []}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="users" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Products by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryStats?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No products yet</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={categoryStats || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {categoryStats?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Downloaded Products */}
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
              <div className="space-y-3">
                {productDownloads?.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                      {index + 1}
                    </div>
                    {product.images?.[0] && (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-bold text-sm shrink-0">
                      <Download className="h-3.5 w-3.5" />
                      {product.download_count ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
