import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, Download, TrendingUp, Calendar, BarChart3, Eye, UserPlus, UserCheck, Monitor, Smartphone, Tablet, Globe, Clock, ArrowRight, Store, Link2, MousePointerClick } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

  // ============ SELLER ANALYTICS ============
  const { data: sellerAnalyticsStats } = useQuery({
    queryKey: ['admin-seller-analytics-stats'],
    queryFn: async () => {
      const [total, storeViews, productViews, uniqueStores] = await Promise.all([
        supabase.from('seller_analytics').select('id', { count: 'exact', head: true }),
        supabase.from('seller_analytics').select('id', { count: 'exact', head: true }).eq('event_type', 'store_view'),
        supabase.from('seller_analytics').select('id', { count: 'exact', head: true }).eq('event_type', 'product_view'),
        supabase.from('seller_analytics').select('store_id'),
      ]);

      const uniqueStoreIds = new Set(uniqueStores.data?.map(s => s.store_id) || []);

      return {
        total: total.count ?? 0,
        storeViews: storeViews.count ?? 0,
        productViews: productViews.count ?? 0,
        uniqueStores: uniqueStoreIds.size,
      };
    },
  });

  // Seller analytics by event type
  const { data: sellerEventTypes } = useQuery({
    queryKey: ['admin-seller-event-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_analytics')
        .select('event_type');
      
      if (error) throw error;

      const eventCount: Record<string, number> = {};
      data?.forEach(e => {
        const type = e.event_type || 'unknown';
        eventCount[type] = (eventCount[type] || 0) + 1;
      });
      
      return Object.entries(eventCount).map(([name, value]) => ({ 
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
        value 
      }));
    },
  });

  // Seller analytics trend over 7 days
  const { data: sellerAnalyticsTrend } = useQuery({
    queryKey: ['admin-seller-analytics-trend'],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const [storeViews, productViews] = await Promise.all([
          supabase.from('seller_analytics').select('id', { count: 'exact', head: true })
            .eq('event_type', 'store_view')
            .gte('created_at', start).lte('created_at', end),
          supabase.from('seller_analytics').select('id', { count: 'exact', head: true })
            .eq('event_type', 'product_view')
            .gte('created_at', start).lte('created_at', end),
        ]);
        
        days.push({
          date: format(date, 'EEE'),
          storeViews: storeViews.count ?? 0,
          productViews: productViews.count ?? 0,
        });
      }
      return days;
    },
  });

  // Top stores by analytics
  const { data: topStores } = useQuery({
    queryKey: ['admin-top-stores'],
    queryFn: async () => {
      const { data: analytics, error } = await supabase
        .from('seller_analytics')
        .select('store_id');
      
      if (error) throw error;

      const storeCount: Record<string, number> = {};
      analytics?.forEach(a => {
        if (a.store_id) {
          storeCount[a.store_id] = (storeCount[a.store_id] || 0) + 1;
        }
      });

      const topStoreIds = Object.entries(storeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      if (topStoreIds.length === 0) return [];

      const { data: stores } = await supabase
        .from('stores')
        .select('id, name, logo_url')
        .in('id', topStoreIds);

      return topStoreIds.map(id => {
        const store = stores?.find(s => s.id === id);
        return {
          id,
          name: store?.name || 'Unknown Store',
          logo_url: store?.logo_url,
          views: storeCount[id],
        };
      });
    },
  });

  // Seller analytics by device
  const { data: sellerDeviceStats } = useQuery({
    queryKey: ['admin-seller-device-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_analytics')
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

  // ============ REFERRAL ANALYTICS ============
  const { data: referralStats } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: async () => {
      const [totalClicks, uniqueReferrers, referrals] = await Promise.all([
        supabase.from('referral_clicks').select('id', { count: 'exact', head: true }),
        supabase.from('referral_clicks').select('referrer_id'),
        supabase.from('referrals').select('id', { count: 'exact', head: true }),
      ]);

      const uniqueReferrerIds = new Set(uniqueReferrers.data?.map(r => r.referrer_id) || []);

      return {
        totalClicks: totalClicks.count ?? 0,
        uniqueReferrers: uniqueReferrerIds.size,
        conversions: referrals.count ?? 0,
      };
    },
  });

  // Referral trend over 7 days
  const { data: referralTrend } = useQuery({
    queryKey: ['admin-referral-trend'],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const { count } = await supabase
          .from('referral_clicks')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end);
        
        days.push({
          date: format(date, 'EEE'),
          clicks: count ?? 0,
        });
      }
      return days;
    },
  });

  // Top referrers
  const { data: topReferrers } = useQuery({
    queryKey: ['admin-top-referrers'],
    queryFn: async () => {
      const { data: clicks, error } = await supabase
        .from('referral_clicks')
        .select('referrer_id, referral_code');
      
      if (error) throw error;

      const referrerCount: Record<string, { clicks: number; code: string }> = {};
      clicks?.forEach(c => {
        if (c.referrer_id) {
          if (!referrerCount[c.referrer_id]) {
            referrerCount[c.referrer_id] = { clicks: 0, code: c.referral_code || '' };
          }
          referrerCount[c.referrer_id].clicks += 1;
        }
      });

      const topReferrerIds = Object.keys(referrerCount).slice(0, 10);

      if (topReferrerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', topReferrerIds);

      return Object.entries(referrerCount)
        .sort((a, b) => b[1].clicks - a[1].clicks)
        .slice(0, 10)
        .map(([id, data]) => {
          const profile = profiles?.find(p => p.user_id === id);
          return {
            id,
            name: profile?.display_name || 'Unknown',
            avatar_url: profile?.avatar_url,
            code: data.code,
            clicks: data.clicks,
          };
        });
    },
  });

  // Recent referral clicks
  const { data: recentReferrals } = useQuery({
    queryKey: ['admin-recent-referrals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_clicks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
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
    storeViews: { label: 'Store Views', color: 'hsl(var(--primary))' },
    productViews: { label: 'Product Views', color: 'hsl(var(--chart-2))' },
    clicks: { label: 'Clicks', color: 'hsl(var(--primary))' },
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout requiredPermissions={['view_analytics']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl sm:text-3xl font-display">Analytics</CardTitle>
            <p className="text-muted-foreground text-sm">Comprehensive platform metrics and insights</p>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="overview">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </div>
                </SelectItem>
                <SelectItem value="page-visits">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Page Visits
                  </div>
                </SelectItem>
                <SelectItem value="seller-analytics">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Seller Analytics
                  </div>
                </SelectItem>
                <SelectItem value="referrals">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Referrals
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden sm:grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="page-visits">Page Visits</TabsTrigger>
            <TabsTrigger value="seller-analytics">Seller Analytics</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>

          {/* ============ OVERVIEW TAB ============ */}
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

            {/* Quick Stats Row - Page Visits + Seller + Referrals */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4" />
                    Page Visits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{pageVisitStats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pageVisitStats?.newVisitors ?? 0} new · {pageVisitStats?.returningVisitors ?? 0} returning
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4" />
                    Seller Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{sellerAnalyticsStats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sellerAnalyticsStats?.storeViews ?? 0} store views · {sellerAnalyticsStats?.productViews ?? 0} product views
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Link2 className="h-4 w-4" />
                    Referral Clicks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{referralStats?.totalClicks ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {referralStats?.uniqueReferrers ?? 0} referrers · {referralStats?.conversions ?? 0} conversions
                  </p>
                </CardContent>
              </Card>
            </div>

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
                    <BarChart data={orderTrend || []} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
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

          {/* ============ PAGE VISITS TAB ============ */}
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
              <CardContent className="p-0 sm:p-6">
                <div className="overflow-x-auto">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Time</TableHead>
                          <TableHead className="whitespace-nowrap">Page</TableHead>
                          <TableHead className="whitespace-nowrap">Type</TableHead>
                          <TableHead className="whitespace-nowrap">Device</TableHead>
                          <TableHead className="whitespace-nowrap">Browser</TableHead>
                          <TableHead className="whitespace-nowrap">Referrer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentVisits?.map((visit) => (
                          <TableRow key={visit.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(visit.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium text-sm whitespace-nowrap">
                              {visit.page_path}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant={visit.is_new_visitor ? 'default' : 'secondary'} className="text-xs">
                                {visit.is_new_visitor ? 'New' : 'Returning'}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {getDeviceIcon(visit.device_type || 'desktop')}
                                <span className="text-xs capitalize">{visit.device_type || 'unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{visit.browser || 'unknown'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap max-w-[150px] truncate">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SELLER ANALYTICS TAB ============ */}
          <TabsContent value="seller-analytics" className="space-y-4">
            {/* Seller Overview */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Seller Analytics Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <MousePointerClick className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sellerAnalyticsStats?.total ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Total Events</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-2/10">
                      <Store className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sellerAnalyticsStats?.storeViews ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Store Views</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-3/10">
                      <Package className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sellerAnalyticsStats?.productViews ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Product Views</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-4/10">
                      <Users className="h-5 w-5 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sellerAnalyticsStats?.uniqueStores ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Active Stores</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Trend Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Seller Activity (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sellerAnalyticsTrend || []} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="storeViews" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="Store Views" />
                      <Area type="monotone" dataKey="productViews" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} name="Product Views" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* Event Type Distribution */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4" />
                    By Event Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sellerEventTypes?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">No events yet</p>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={sellerEventTypes || []}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {sellerEventTypes?.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
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
                  {sellerDeviceStats?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-sm">No data yet</p>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={sellerDeviceStats || []}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            dataKey="value"
                            nameKey="name"
                            label={({ name }) => name}
                          >
                            {sellerDeviceStats?.map((_, index) => (
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

            {/* Top Stores */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Top Stores by Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topStores?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No store activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {topStores?.map((store, index) => (
                      <div key={store.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        {store.logo_url ? (
                          <img 
                            src={store.logo_url} 
                            alt={store.name} 
                            className="w-9 h-9 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Store className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{store.name}</p>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-bold text-sm shrink-0">
                          <Eye className="h-3.5 w-3.5" />
                          {store.views}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ REFERRALS TAB ============ */}
          <TabsContent value="referrals" className="space-y-4">
            {/* Referral Overview */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Referral Analytics Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <MousePointerClick className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{referralStats?.totalClicks ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Total Clicks</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-2/10">
                      <Users className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{referralStats?.uniqueReferrers ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Active Referrers</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-3/10">
                      <UserPlus className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{referralStats?.conversions ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Conversions</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referral Trend Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Referral Clicks (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={referralTrend || []} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Top Referrers */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topReferrers?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No referral activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {topReferrers?.map((referrer, index) => (
                      <div key={referrer.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        {referrer.avatar_url ? (
                          <img 
                            src={referrer.avatar_url} 
                            alt={referrer.name} 
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{referrer.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{referrer.code}</p>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-bold text-sm shrink-0">
                          <MousePointerClick className="h-3.5 w-3.5" />
                          {referrer.clicks}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Referral Logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Referral Clicks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="overflow-x-auto">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Time</TableHead>
                          <TableHead className="whitespace-nowrap">Referral Code</TableHead>
                          <TableHead className="whitespace-nowrap">User Agent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentReferrals?.map((referral) => (
                          <TableRow key={referral.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(referral.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium text-sm whitespace-nowrap font-mono">
                              {referral.referral_code}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap max-w-[300px] truncate">
                              {referral.user_agent || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!recentReferrals || recentReferrals.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              No referral clicks recorded yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
