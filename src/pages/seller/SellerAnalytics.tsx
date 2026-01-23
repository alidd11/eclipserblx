import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
  Legend 
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { 
  Eye, 
  ShoppingCart, 
  CreditCard, 
  TrendingUp,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MousePointer
} from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SellerAnalytics() {
  const { store } = useSellerStatus();
  const [timeRange, setTimeRange] = useState('7d');

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

  // Process analytics data
  const processedData = (() => {
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

    // Conversion rate
    const conversionRate = totals.storeViews > 0 
      ? ((totals.purchases / totals.storeViews) * 100).toFixed(2)
      : '0.00';

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

    return {
      dailyData,
      totals,
      conversionRate,
      deviceData,
      referrerData,
      countryData,
    };
  })();

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
            <Tabs defaultValue="traffic" className="w-full">
              <TabsList>
                <TabsTrigger value="traffic">Traffic</TabsTrigger>
                <TabsTrigger value="conversions">Conversions</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
              </TabsList>

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
                          <Line 
                            type="monotone" 
                            dataKey="views" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {processedData.deviceData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={processedData.deviceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
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
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          No device data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Countries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {processedData.countryData.length > 0 ? (
                        <div className="space-y-4">
                          {processedData.countryData.map((country, index) => (
                            <div key={country.name} className="flex items-center gap-3">
                              <div className="w-6 text-center text-sm text-muted-foreground">
                                {index + 1}
                              </div>
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{country.name}</span>
                                  <span className="text-sm text-muted-foreground">{country.value}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full"
                                    style={{ 
                                      width: `${(country.value / processedData.countryData[0].value) * 100}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          No country data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="conversions">
                <Card>
                  <CardHeader>
                    <CardTitle>Conversion Funnel</CardTitle>
                    <CardDescription>From views to purchases</CardDescription>
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
                              className="w-3 h-3 rounded-full"
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
