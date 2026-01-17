import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, Download, TrendingUp, Calendar, BarChart3, Eye, UserPlus, UserCheck, Monitor, Smartphone, Tablet, Globe, Clock, ArrowRight } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');

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

  // Page visits statistics
  const { data: pageVisitStats } = useQuery({
    queryKey: ['admin-page-visit-stats'],
    queryFn: async () => {
      const [total, newVisitors, returningVisitors] = await Promise.all([
        supabase.from('page_visits').select('id', { count: 'exact', head: true }),
        supabase.from('page_visits').select('id', { count: 'exact', head: true }).eq('is_new_visitor', true),
        supabase.from('page_visits').select('id', { count: 'exact', head: true }).eq('is_new_visitor', false),
      ]);

      return {
        total: total.count ?? 0,
        newVisitors: newVisitors.count ?? 0,
        returningVisitors: returningVisitors.count ?? 0,
      };
    },
  });

  // Page visits by page
  const { data: pageVisitsByPage } = useQuery({
    queryKey: ['admin-page-visits-by-page'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_visits')
        .select('page_path');
      
      if (error) throw error;

      const pageCount: Record<string, number> = {};
      data?.forEach(v => {
        pageCount[v.page_path] = (pageCount[v.page_path] || 0) + 1;
      });
      
      return Object.entries(pageCount)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Page visits by device type
  const { data: deviceStats } = useQuery({
    queryKey: ['admin-device-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_visits')
        .select('device_type');
      
      if (error) throw error;

      const deviceCount: Record<string, number> = {};
      data?.forEach(v => {
        const device = v.device_type || 'unknown';
        deviceCount[device] = (deviceCount[device] || 0) + 1;
      });
      
      return Object.entries(deviceCount).map(([name, value]) => ({ name, value }));
    },
  });

  // Page visits by browser
  const { data: browserStats } = useQuery({
    queryKey: ['admin-browser-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_visits')
        .select('browser');
      
      if (error) throw error;

      const browserCount: Record<string, number> = {};
      data?.forEach(v => {
        const browser = v.browser || 'unknown';
        browserCount[browser] = (browserCount[browser] || 0) + 1;
      });
      
      return Object.entries(browserCount).map(([name, value]) => ({ name, value }));
    },
  });

  // Page visits trend over 7 days
  const { data: visitTrend } = useQuery({
    queryKey: ['admin-visit-trend'],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const [total, newV] = await Promise.all([
          supabase.from('page_visits').select('id', { count: 'exact', head: true })
            .gte('created_at', start).lte('created_at', end),
          supabase.from('page_visits').select('id', { count: 'exact', head: true })
            .gte('created_at', start).lte('created_at', end).eq('is_new_visitor', true),
        ]);
        
        days.push({
          date: format(date, 'EEE'),
          total: total.count ?? 0,
          new: newV.count ?? 0,
          returning: (total.count ?? 0) - (newV.count ?? 0),
        });
      }
      return days;
    },
  });

  // Recent page visits logs
  const { data: recentVisits } = useQuery({
    queryKey: ['admin-recent-visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_visits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const chartConfig = {
    downloads: { label: 'Downloads', color: 'hsl(var(--primary))' },
    orders: { label: 'Orders', color: 'hsl(var(--chart-2))' },
    users: { label: 'Users', color: 'hsl(var(--chart-3))' },
    total: { label: 'Total Visits', color: 'hsl(var(--primary))' },
    new: { label: 'New Visitors', color: 'hsl(var(--chart-2))' },
    returning: { label: 'Returning', color: 'hsl(var(--chart-3))' },
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="page-visits">Page Visits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
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
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={downloadTrend || []} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="downloads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={orderTrend || []} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="orders" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
                    </LineChart>
                  </ResponsiveContainer>
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
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userTrend || []} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="users" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
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
                    </ResponsiveContainer>
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
          </TabsContent>

          <TabsContent value="page-visits" className="space-y-4">
            {/* Visitor Statistics Overview */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visitor Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pageVisitStats?.total ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Total Visits</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-2/10">
                      <UserPlus className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pageVisitStats?.newVisitors ?? 0}</p>
                      <p className="text-xs text-muted-foreground">New Visitors</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-3/10">
                      <UserCheck className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pageVisitStats?.returningVisitors ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Returning</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visitor Trend Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Visitor Trend (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visitTrend || []} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="new" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} name="New" />
                      <Bar dataKey="returning" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Returning" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              {/* Page Visits by Page */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4" />
                    By Page
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pageVisitsByPage?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">No visits yet</p>
                  ) : (
                    <div className="space-y-2">
                      {pageVisitsByPage?.slice(0, 5).map((item) => (
                        <div key={item.page} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span className="text-sm truncate flex-1">{item.page}</span>
                          <Badge variant="secondary" className="ml-2">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Distribution */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Monitor className="h-4 w-4" />
                    By Device
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deviceStats?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">No data yet</p>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={deviceStats || []}
                            cx="50%"
                            cy="50%"
                            outerRadius={50}
                            dataKey="value"
                            nameKey="name"
                            label={({ name }) => name}
                          >
                            {deviceStats?.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Browser Distribution */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4" />
                    By Browser
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {browserStats?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">No data yet</p>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={browserStats || []}
                            cx="50%"
                            cy="50%"
                            outerRadius={50}
                            dataKey="value"
                            nameKey="name"
                            label={({ name }) => name}
                          >
                            {browserStats?.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Visit Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Visit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Browser</TableHead>
                        <TableHead>Referrer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentVisits?.map((visit) => (
                        <TableRow key={visit.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(visit.created_at), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {visit.page_path}
                          </TableCell>
                          <TableCell>
                            <Badge variant={visit.is_new_visitor ? 'default' : 'secondary'} className="text-xs">
                              {visit.is_new_visitor ? 'New' : 'Returning'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getDeviceIcon(visit.device_type || 'desktop')}
                              <span className="text-xs capitalize">{visit.device_type || 'unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{visit.browser || 'unknown'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {visit.referrer || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!recentVisits || recentVisits.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No visits recorded yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
