import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, Download, TrendingUp, Calendar, BarChart3, Eye, UserPlus, UserCheck, Monitor, Smartphone, Tablet, Globe, Clock, ArrowRight, Store, Link2, MousePointerClick, FileDown, MapPin } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { RevolutBarChart, RevolutAreaChart } from '@/components/ui/revolut-chart';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { format, subDays, startOfDay, endOfDay } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PercentChange } from '@/components/admin/analytics/PercentChange';

import { exportToCSV } from '@/lib/export-csv';

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [range, setRange] = useState<'7d' | '14d' | '30d'>('7d');
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
  const rangeLabel = range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days';

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

  // Downloads trend
  const { data: downloadTrend } = useQuery({
    queryKey: ['admin-download-trend', range],
    queryFn: async () => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const { count } = await supabase
          .from('download_logs')
          .select('id', { count: 'exact', head: true })
          .gte('downloaded_at', start)
          .lte('downloaded_at', end);
        
        result.push({
          date: format(date, days <= 7 ? 'EEE' : 'MMM d'),
          downloads: count ?? 0,
        });
      }
      return result;
    },
  });

  // Orders trend
  const { data: orderTrend } = useQuery({
    queryKey: ['admin-order-trend', range],
    queryFn: async () => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end);
        
        result.push({
          date: format(date, days <= 7 ? 'EEE' : 'MMM d'),
          orders: count ?? 0,
        });
      }
      return result;
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

  // User registrations trend
  const { data: userTrend } = useQuery({
    queryKey: ['admin-user-trend', range],
    queryFn: async () => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        result.push({ date: format(date, days <= 7 ? 'EEE' : 'MMM d'), users: count ?? 0 });
      }
      return result;
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

  // Page visits trend
  const { data: visitTrend } = useQuery({
    queryKey: ['admin-visit-trend', range],
    queryFn: async () => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        const [total, newV] = await Promise.all([
          supabase.from('page_visits').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
          supabase.from('page_visits').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end).eq('is_new_visitor', true),
        ]);
        result.push({
          date: format(date, days <= 7 ? 'EEE' : 'MMM d'),
          total: total.count ?? 0,
          new: newV.count ?? 0,
          returning: (total.count ?? 0) - (newV.count ?? 0),
        });
      }
      return result;
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

  // Seller analytics trend
  const { data: sellerAnalyticsTrend } = useQuery({
    queryKey: ['admin-seller-analytics-trend', range],
    queryFn: async () => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        const [storeViews, productViews] = await Promise.all([
          supabase.from('seller_analytics').select('id', { count: 'exact', head: true }).eq('event_type', 'store_view').gte('created_at', start).lte('created_at', end),
          supabase.from('seller_analytics').select('id', { count: 'exact', head: true }).eq('event_type', 'product_view').gte('created_at', start).lte('created_at', end),
        ]);
        result.push({
          date: format(date, days <= 7 ? 'EEE' : 'MMM d'),
          storeViews: storeViews.count ?? 0,
          productViews: productViews.count ?? 0,
        });
      }
      return result;
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

  // Referral trend
  const { data: referralTrend } = useQuery({
    queryKey: ['admin-referral-trend', range],
    queryFn: async () => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        const { count } = await supabase.from('referral_clicks').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
        result.push({ date: format(date, days <= 7 ? 'EEE' : 'MMM d'), clicks: count ?? 0 });
      }
      return result;
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

  // Period comparison stats
  const { data: currentPeriodStats } = useQuery({
    queryKey: ['admin-current-period-stats', range],
    queryFn: async () => {
      const start = startOfDay(subDays(new Date(), days - 1)).toISOString();
      const end = endOfDay(new Date()).toISOString();
      const [downloads, orders, users, visits] = await Promise.all([
        supabase.from('download_logs').select('id', { count: 'exact', head: true }).gte('downloaded_at', start).lte('downloaded_at', end),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
        supabase.from('page_visits').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
      ]);
      return { downloads: downloads.count ?? 0, orders: orders.count ?? 0, users: users.count ?? 0, visits: visits.count ?? 0 };
    },
  });

  const { data: previousPeriodStats } = useQuery({
    queryKey: ['admin-previous-period-stats', range],
    queryFn: async () => {
      const start = startOfDay(subDays(new Date(), days * 2 - 1)).toISOString();
      const end = endOfDay(subDays(new Date(), days)).toISOString();
      const [downloads, orders, users, visits] = await Promise.all([
        supabase.from('download_logs').select('id', { count: 'exact', head: true }).gte('downloaded_at', start).lte('downloaded_at', end),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
        supabase.from('page_visits').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
      ]);
      return { downloads: downloads.count ?? 0, orders: orders.count ?? 0, users: users.count ?? 0, visits: visits.count ?? 0 };
    },
  });

  // Country breakdown
  const { data: countryStats } = useQuery({
    queryKey: ['admin-country-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('page_visits').select('*').limit(1000);
      const countryCount: Record<string, number> = {};
      (data as any[])?.forEach(v => {
        const country = v.country || 'Unknown';
        countryCount[country] = (countryCount[country] || 0) + 1;
      });
      return Object.entries(countryCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    },
  });

            {/* Country Breakdown */}
            <div className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  By Country
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!countryStats || countryStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">No country data yet</p>
                ) : (
                  <div className="space-y-2">
                    {countryStats.slice(0, 8).map((item) => {
                      const maxVal = countryStats[0]?.value || 1;
                      return (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.value}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(item.value / maxVal) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </div>


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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Comprehensive platform metrics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              {(['7d', '14d', '30d'] as const).map(r => (
                <Button
                  key={r}
                  variant={range === r ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRange(r)}
                  className="text-xs h-7 px-3"
                >
                  {r}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const exportData = activeTab === 'page-visits' ? recentVisits :
                  activeTab === 'referrals' ? recentReferrals :
                  downloadTrend;
                if (exportData?.length) exportToCSV(exportData as any[], `analytics-${activeTab}-${range}`);
              }}
            >
              <FileDown className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </div>
        </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-auto min-w-[140px] bg-background">
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
            <div className="bg-card border-border">
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
                    {currentPeriodStats && previousPeriodStats && (
                      <PercentChange current={currentPeriodStats.orders} previous={previousPeriodStats.orders} label={`vs prev ${range}`} />
                    )}
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
                    {currentPeriodStats && previousPeriodStats && (
                      <PercentChange current={currentPeriodStats.users} previous={previousPeriodStats.users} label={`vs prev ${range}`} />
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.downloads ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Downloads</p>
                    </div>
                    {currentPeriodStats && previousPeriodStats && (
                      <PercentChange current={currentPeriodStats.downloads} previous={previousPeriodStats.downloads} label={`vs prev ${range}`} />
                    )}
                  </div>
                </div>
              </CardContent>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const visits = pageVisitStats?.total ?? 0;
                  const productViews = sellerAnalyticsStats?.productViews ?? 0;
                  const orders = stats?.orders ?? 0;
                  const maxVal = Math.max(visits, 1);
                  const stages = [
                    { label: 'Page Visits', value: visits },
                    { label: 'Product Views', value: productViews },
                    { label: 'Orders', value: orders },
                  ];
                  return (
                    <div className="space-y-3">
                      {stages.map((stage, i) => {
                        const pct = visits > 0 ? ((stage.value / maxVal) * 100).toFixed(1) : '0';
                        const dropoff = i > 0 && stages[i - 1].value > 0
                          ? ((1 - stage.value / stages[i - 1].value) * 100).toFixed(0)
                          : null;
                        return (
                          <div key={stage.label} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{stage.label}</span>
                                {dropoff && (
                                  <span className="text-[10px] text-muted-foreground">-{dropoff}% drop</span>
                                )}
                              </div>
                              <span className="text-sm font-bold">{stage.value.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, opacity: 1 - i * 0.2 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </div>

            {/* Quick Stats Row - Page Visits + Seller + Referrals */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div className="bg-card border-border">
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
              </div>

              <div className="bg-card border-border">
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
              </div>

              <div className="bg-card border-border">
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
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* Downloads Trend */}
              <div className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Downloads (Last {rangeLabel})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <RevolutAreaChart
                  data={downloadTrend || []}
                  xKey="date"
                  series={[{ dataKey: 'downloads', color: 'hsl(262 100% 71%)', name: 'Downloads', gradientId: 'dlGrad' }]}
                  height={250}
                />
                </CardContent>
              </div>

              {/* Orders Trend */}
              <div className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Orders (Last {rangeLabel})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <RevolutAreaChart
                  data={orderTrend || []}
                  xKey="date"
                  series={[{ dataKey: 'orders', color: 'hsl(220 95% 59%)', name: 'Orders', gradientId: 'ordGrad' }]}
                  height={250}
                />
                </CardContent>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* User Registrations */}
              <div className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    New Users (Last {rangeLabel})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <RevolutAreaChart
                  data={userTrend || []}
                  xKey="date"
                  series={[{ dataKey: 'users', color: 'hsl(240 90% 65%)', name: 'Users', gradientId: 'usrGrad' }]}
                  height={250}
                />
                </CardContent>
              </div>

              {/* Category Distribution */}
              <div className="bg-card border-border">
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
                    <RevolutDonutChart
                      data={categoryStats || []}
                      height={320}
                      showLabels={false}
                      showLegend
                      innerRadius={50}
                      outerRadius={85}
                    />
                  )}
                </CardContent>
              </div>
            </div>

            {/* Top Downloaded Products */}
            <div className="bg-card border-border">
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
            </div>
          </TabsContent>

          {/* ============ PAGE VISITS TAB ============ */}
          <TabsContent value="page-visits" className="space-y-4">
            {/* Visitor Statistics Overview */}
            <div className="bg-card border-border">
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
            </div>

            {/* Visitor Trend Chart */}
            <div className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Visitor Trend (Last {rangeLabel})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RevolutAreaChart
                  data={visitTrend || []}
                  xKey="date"
                  series={[
                    { dataKey: 'new', color: 'hsl(262 100% 71%)', name: 'New' },
                    { dataKey: 'returning', color: 'hsl(220 95% 59%)', name: 'Returning' },
                  ]}
                  height={250}
                />
              </CardContent>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              {/* Page Visits by Page */}
              <div className="bg-card border-border">
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
              </div>

              {/* Device Distribution */}
              <div className="bg-card border-border">
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
                    <RevolutDonutChart
                      data={deviceStats || []}
                      height={150}
                      innerRadius={30}
                      outerRadius={50}
                      showLegend={false}
                      showLabels
                    />
                  )}
                </CardContent>
              </div>

              {/* Browser Distribution */}
              <div className="bg-card border-border">
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
                    <RevolutDonutChart
                      data={browserStats || []}
                      height={150}
                      innerRadius={30}
                      outerRadius={50}
                      showLegend={false}
                      showLabels
                    />
                  )}
                </CardContent>
              </div>
            </div>

            {/* Recent Visit Logs */}
            <div className="bg-card border-border">
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
            </div>
          </TabsContent>

          {/* ============ SELLER ANALYTICS TAB ============ */}
          <TabsContent value="seller-analytics" className="space-y-4">
            {/* Seller Overview */}
            <div className="bg-card border-border">
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
            </div>

            {/* Seller Trend Chart */}
            <div className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Seller Activity (Last {rangeLabel})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RevolutAreaChart
                  data={sellerAnalyticsTrend || []}
                  xKey="date"
                  series={[
                    { dataKey: 'storeViews', color: 'hsl(262 100% 71%)', name: 'Store Views' },
                    { dataKey: 'productViews', color: 'hsl(220 95% 59%)', name: 'Product Views' },
                  ]}
                  height={250}
                />
              </CardContent>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* Event Type Distribution */}
              <div className="bg-card border-border">
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
                    <RevolutDonutChart
                      data={sellerEventTypes || []}
                      height={200}
                      showLabels
                    />
                  )}
                </CardContent>
              </div>

              {/* Device Distribution */}
              <div className="bg-card border-border">
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
                    <RevolutDonutChart
                      data={sellerDeviceStats || []}
                      height={200}
                      showLabels
                    />
                  )}
                </CardContent>
              </div>
            </div>

            {/* Top Stores */}
            <div className="bg-card border-border">
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
            </div>
          </TabsContent>

          {/* ============ REFERRALS TAB ============ */}
          <TabsContent value="referrals" className="space-y-4">
            {/* Referral Overview */}
            <div className="bg-card border-border">
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
            </div>

            {/* Referral Trend Chart */}
            <div className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Referral Clicks (Last {rangeLabel})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RevolutAreaChart
                  data={referralTrend || []}
                  xKey="date"
                  series={[{ dataKey: 'clicks', color: 'hsl(262 100% 71%)', name: 'Clicks' }]}
                  height={250}
                />
              </CardContent>
            </div>

            {/* Top Referrers */}
            <div className="bg-card border-border">
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
            </div>

            {/* Recent Referral Logs */}
            <div className="bg-card border-border">
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
