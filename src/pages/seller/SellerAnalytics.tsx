import { useState, useMemo } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { ExportReportsCard } from '@/components/seller/ExportReportsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { 
  Eye, 
  ShoppingCart, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MousePointer,
  Package,
  ArrowDown,
  UserCheck,
  UserPlus
} from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SellerAnalytics() {
  const { store } = useSellerStatus();
  const [timeRange, setTimeRange] = useState('7d');
  const [chartTab, setChartTab] = useState('traffic');

  const getDateRange = () => {
    const end = endOfDay(new Date());
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const start = startOfDay(subDays(new Date(), daysBack));
    return { start, end, daysBack };
  };

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['seller-analytics', store?.id, timeRange],
    queryFn: async () => {
      if (!store?.id) return null;
      
      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('seller_analytics')
        .select('*')
        .eq('store_id', store.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Fetch product names for product performance
  const productIds = useMemo(() => {
    if (!analyticsData) return [];
    const ids = new Set(analyticsData.filter((e: any) => e.product_id).map((e: any) => e.product_id));
    return Array.from(ids) as string[];
  }, [analyticsData]);

  const { data: productsMap } = useQuery({
    queryKey: ['seller-analytics-products', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return {};
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .in('id', productIds);
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: productIds.length > 0,
  });

  // Process analytics data
  const processedData = useMemo(() => {
    if (!analyticsData) return null;

    const { start, end } = getDateRange();
    const days = eachDayOfInterval({ start, end });

    // Daily counts
    const dailyData = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEvents = analyticsData.filter(
        (e: any) => format(new Date(e.created_at), 'yyyy-MM-dd') === dayStr
      );
      
      return {
        date: format(day, 'MMM d'),
        views: dayEvents.filter((e: any) => e.event_type === 'store_view' || e.event_type === 'product_view').length,
        addToCarts: dayEvents.filter((e: any) => e.event_type === 'add_to_cart').length,
        purchases: dayEvents.filter((e: any) => e.event_type === 'purchase').length,
        uniqueVisitors: new Set(dayEvents.map((e: any) => e.visitor_id)).size,
      };
    });

    // Totals
    const totals = {
      storeViews: analyticsData.filter((e: any) => e.event_type === 'store_view').length,
      productViews: analyticsData.filter((e: any) => e.event_type === 'product_view').length,
      addToCarts: analyticsData.filter((e: any) => e.event_type === 'add_to_cart').length,
      purchases: analyticsData.filter((e: any) => e.event_type === 'purchase').length,
      uniqueVisitors: new Set(analyticsData.map((e: any) => e.visitor_id)).size,
    };

    // Visitor analysis
    const visitorEventCounts = analyticsData.reduce((acc: Record<string, number>, e: any) => {
      acc[e.visitor_id] = (acc[e.visitor_id] || 0) + 1;
      return acc;
    }, {});
    const returningVisitors = Object.values(visitorEventCounts).filter((count: any) => count > 1).length;
    const newVisitors = totals.uniqueVisitors - returningVisitors;

    // Conversion rate
    const totalViews = totals.storeViews + totals.productViews;
    const conversionRate = totalViews > 0 
      ? ((totals.purchases / totalViews) * 100).toFixed(2)
      : '0.00';

    // Funnel data
    const funnelData = [
      { name: 'Store Views', value: totals.storeViews, fill: 'hsl(var(--primary))' },
      { name: 'Product Views', value: totals.productViews, fill: 'hsl(var(--chart-2))' },
      { name: 'Add to Cart', value: totals.addToCarts, fill: 'hsl(var(--chart-3))' },
      { name: 'Purchases', value: totals.purchases, fill: 'hsl(var(--chart-4))' },
    ];

    // Funnel step percentages
    const funnelSteps = funnelData.map((step, i) => {
      const prevValue = i === 0 ? step.value : funnelData[i - 1].value;
      const dropOff = prevValue > 0 ? ((1 - step.value / prevValue) * 100).toFixed(1) : '0.0';
      const rate = prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : '0.0';
      return { ...step, dropOff, rate, prevValue };
    });

    // Device breakdown
    const deviceCounts = analyticsData.reduce((acc: any, event: any) => {
      const device = event.device_type || 'Unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});
    
    const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Top referrers
    const referrerCounts = analyticsData.reduce((acc: any, event: any) => {
      if (event.referrer) {
        try {
          const url = new URL(event.referrer);
          const domain = url.hostname;
          acc[domain] = (acc[domain] || 0) + 1;
        } catch {
          acc['Direct'] = (acc['Direct'] || 0) + 1;
        }
      } else {
        acc['Direct'] = (acc['Direct'] || 0) + 1;
      }
      return acc;
    }, {});

    const referrerData = Object.entries(referrerCounts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Country breakdown
    const countryCounts = analyticsData.reduce((acc: any, event: any) => {
      const country = event.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    const countryData = Object.entries(countryCounts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Product performance
    const productStats = analyticsData.reduce((acc: Record<string, any>, e: any) => {
      if (!e.product_id) return acc;
      if (!acc[e.product_id]) {
        acc[e.product_id] = { id: e.product_id, views: 0, carts: 0, purchases: 0 };
      }
      if (e.event_type === 'product_view') acc[e.product_id].views++;
      if (e.event_type === 'add_to_cart') acc[e.product_id].carts++;
      if (e.event_type === 'purchase') acc[e.product_id].purchases++;
      return acc;
    }, {});

    const productPerformance = Object.values(productStats)
      .map((p: any) => ({
        ...p,
        conversionRate: p.views > 0 ? ((p.purchases / p.views) * 100).toFixed(1) : '0.0',
        cartRate: p.views > 0 ? ((p.carts / p.views) * 100).toFixed(1) : '0.0',
      }))
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 10);

    return {
      dailyData,
      totals,
      conversionRate,
      deviceData,
      referrerData,
      countryData,
      funnelSteps,
      newVisitors,
      returningVisitors,
      productPerformance,
    };
  }, [analyticsData]);

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Track your store's performance and customer behavior
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 min-w-[140px] flex-shrink-0 md:min-w-0" />)}
            </div>
            <Skeleton className="h-80" />
          </div>
        ) : processedData ? (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible">
              <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">Store Views</span>
                  </div>
                  <p className="text-2xl font-bold">{processedData.totals.storeViews.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MousePointer className="h-4 w-4" />
                    <span className="text-sm">Product Views</span>
                  </div>
                  <p className="text-2xl font-bold">{processedData.totals.productViews.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="text-sm">Add to Carts</span>
                  </div>
                  <p className="text-2xl font-bold">{processedData.totals.addToCarts.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">Purchases</span>
                  </div>
                  <p className="text-2xl font-bold">{processedData.totals.purchases.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Conversion</span>
                  </div>
                  <p className="text-2xl font-bold">{processedData.conversionRate}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs value={chartTab} onValueChange={setChartTab} className="w-full">
              {/* Mobile dropdown */}
              <div className="sm:hidden mb-4">
                <Select value={chartTab} onValueChange={setChartTab}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="traffic">Traffic</SelectItem>
                    <SelectItem value="funnel">Funnel</SelectItem>
                    <SelectItem value="products">Products</SelectItem>
                    <SelectItem value="sources">Sources</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop tabs */}
              <TabsList className="hidden sm:inline-flex">
                <TabsTrigger value="traffic">Traffic</TabsTrigger>
                <TabsTrigger value="funnel">Funnel</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
              </TabsList>

              {/* ── Traffic Tab ── */}
              <TabsContent value="traffic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Views Over Time</CardTitle>
                    <CardDescription>Daily store and product views</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={processedData.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }} 
                          />
                          <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Views" />
                          <Line type="monotone" dataKey="uniqueVisitors" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Unique Visitors" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Visitor Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Visitor Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-primary" />
                            <span className="text-sm">New Visitors</span>
                          </div>
                          <span className="font-semibold">{processedData.newVisitors}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-chart-2" />
                            <span className="text-sm">Returning</span>
                          </div>
                          <span className="font-semibold">{processedData.returningVisitors}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                          {processedData.totals.uniqueVisitors > 0 && (
                            <>
                              <div 
                                className="h-full bg-primary"
                                style={{ width: `${(processedData.newVisitors / processedData.totals.uniqueVisitors) * 100}%` }}
                              />
                              <div 
                                className="h-full bg-chart-2"
                                style={{ width: `${(processedData.returningVisitors / processedData.totals.uniqueVisitors) * 100}%` }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Device Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Device Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {processedData.deviceData.length > 0 ? (
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={processedData.deviceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={65}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {processedData.deviceData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Legend />
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                          No device data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Countries */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Countries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {processedData.countryData.length > 0 ? (
                        <div className="space-y-3">
                          {processedData.countryData.map((country, index) => (
                            <div key={country.name} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium truncate">{country.name}</span>
                                  <span className="text-muted-foreground">{country.value}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${(country.value / processedData.countryData[0].value) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                          No country data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Funnel Tab ── */}
              <TabsContent value="funnel" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Conversion Funnel</CardTitle>
                    <CardDescription>Track drop-off at each stage from view to purchase</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Visual Step Funnel */}
                    <div className="space-y-0">
                      {processedData.funnelSteps.map((step, i) => {
                        const maxValue = processedData.funnelSteps[0].value || 1;
                        const widthPercent = Math.max(20, (step.value / maxValue) * 100);
                        
                        return (
                          <div key={step.name}>
                            <div className="flex items-center gap-4">
                              <div className="w-28 text-sm font-medium text-right shrink-0">
                                {step.name}
                              </div>
                              <div className="flex-1">
                                <div 
                                  className="h-12 rounded-lg flex items-center px-4 transition-all"
                                  style={{ 
                                    width: `${widthPercent}%`,
                                    backgroundColor: step.fill,
                                    opacity: 0.85,
                                  }}
                                >
                                  <span className="text-sm font-bold text-white">
                                    {step.value.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              {i > 0 && (
                                <div className="w-20 text-right shrink-0">
                                  <span className="text-sm font-semibold text-green-500">
                                    {step.rate}%
                                  </span>
                                  <p className="text-[10px] text-muted-foreground">
                                    of previous
                                  </p>
                                </div>
                              )}
                            </div>
                            {i < processedData.funnelSteps.length - 1 && (
                              <div className="flex items-center gap-4 py-1">
                                <div className="w-28" />
                                <div className="flex items-center gap-1 text-xs text-muted-foreground pl-4">
                                  <ArrowDown className="h-3 w-3" />
                                  <span>{processedData.funnelSteps[i + 1].dropOff}% drop-off</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Conversion Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Conversion Breakdown</CardTitle>
                    <CardDescription>Views, add-to-carts, and purchases per day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }} 
                          />
                          <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" />
                          <Bar dataKey="addToCarts" fill="hsl(var(--chart-2))" name="Add to Cart" />
                          <Bar dataKey="purchases" fill="hsl(var(--chart-3))" name="Purchases" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Products Tab ── */}
              <TabsContent value="products" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Performance</CardTitle>
                    <CardDescription>Per-product analytics — views, cart adds, purchases, and conversion rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {processedData.productPerformance.length > 0 ? (
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 pb-2 border-b border-border">
                          <div className="col-span-4">Product</div>
                          <div className="col-span-2 text-center">Views</div>
                          <div className="col-span-2 text-center">Add to Cart</div>
                          <div className="col-span-2 text-center">Purchases</div>
                          <div className="col-span-2 text-center">Conv. Rate</div>
                        </div>
                        {processedData.productPerformance.map((product: any) => {
                          const info = productsMap?.[product.id];
                          return (
                            <div key={product.id} className="grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="col-span-4 flex items-center gap-2 min-w-0">
                                {info?.image_url ? (
                                  <img src={info.image_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                                ) : (
                                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="text-sm font-medium truncate">
                                  {info?.name || 'Unknown Product'}
                                </span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className="text-sm font-semibold">{product.views}</span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className="text-sm">{product.carts}</span>
                                <span className="text-xs text-muted-foreground ml-1">({product.cartRate}%)</span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className="text-sm">{product.purchases}</span>
                              </div>
                              <div className="col-span-2 text-center">
                                <Badge variant={Number(product.conversionRate) >= 5 ? 'default' : 'secondary'} className="text-xs">
                                  {product.conversionRate}%
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p>No product-level analytics available yet</p>
                        <p className="text-sm mt-1">Data appears once customers view your products</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Sources Tab ── */}
              <TabsContent value="sources">
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Sources</CardTitle>
                    <CardDescription>Where your visitors come from</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {processedData.referrerData.length > 0 ? (
                      <div className="space-y-4">
                        {processedData.referrerData.map((source, index) => (
                          <div key={source.name} className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{source.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {source.value} visits ({((source.value / analyticsData!.length) * 100).toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: `${(source.value / processedData.referrerData[0].value) * 100}%`,
                                    backgroundColor: COLORS[index % COLORS.length]
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        No referrer data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Export Reports */}
            <ExportReportsCard />
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground">
                Analytics will start tracking once customers visit your store
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </SellerLayout>
  );
}
