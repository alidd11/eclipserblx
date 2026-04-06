import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from '@/lib/dateUtils';

export function useAnalyticsData(range: '7d' | '14d' | '30d') {
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;

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
        result.push({ date: format(date, days <= 7 ? 'EEE' : 'MMM d'), downloads: count ?? 0 });
      }
      return result;
    },
  });

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
        result.push({ date: format(date, days <= 7 ? 'EEE' : 'MMM d'), orders: count ?? 0 });
      }
      return result;
    },
  });

  const { data: categoryStats } = useQuery({
    queryKey: ['admin-category-stats'],
    queryFn: async () => {
      const { data: products } = await supabase.from('products').select('category_id, categories(name)');
      const categoryCount: Record<string, number> = {};
      products?.forEach(p => {
        const name = (p.categories as { name: string } | null)?.name || 'Uncategorized';
        categoryCount[name] = (categoryCount[name] || 0) + 1;
      });
      return Object.entries(categoryCount).map(([name, value]) => ({ name, value }));
    },
  });

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

  const { data: pageVisitStats } = useQuery({
    queryKey: ['admin-page-visit-stats'],
    queryFn: async () => {
      const [total, newVisitors, returningVisitors] = await Promise.all([
        supabase.from('page_visits').select('id', { count: 'exact', head: true }),
        supabase.from('page_visits').select('id', { count: 'exact', head: true }).eq('is_new_visitor', true),
        supabase.from('page_visits').select('id', { count: 'exact', head: true }).eq('is_new_visitor', false),
      ]);
      return { total: total.count ?? 0, newVisitors: newVisitors.count ?? 0, returningVisitors: returningVisitors.count ?? 0 };
    },
  });

  const { data: pageVisitsByPage } = useQuery({
    queryKey: ['admin-page-visits-by-page'],
    queryFn: async () => {
      const { data, error } = await supabase.from('page_visits').select('page_path');
      if (error) throw error;
      const pageCount: Record<string, number> = {};
      data?.forEach(v => { pageCount[v.page_path] = (pageCount[v.page_path] || 0) + 1; });
      return Object.entries(pageCount).map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count);
    },
  });

  const { data: deviceStats } = useQuery({
    queryKey: ['admin-device-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('page_visits').select('device_type');
      if (error) throw error;
      const deviceCount: Record<string, number> = {};
      data?.forEach(v => { const device = v.device_type || 'unknown'; deviceCount[device] = (deviceCount[device] || 0) + 1; });
      return Object.entries(deviceCount).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: browserStats } = useQuery({
    queryKey: ['admin-browser-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('page_visits').select('browser');
      if (error) throw error;
      const browserCount: Record<string, number> = {};
      data?.forEach(v => { const browser = v.browser || 'unknown'; browserCount[browser] = (browserCount[browser] || 0) + 1; });
      return Object.entries(browserCount).map(([name, value]) => ({ name, value }));
    },
  });

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

  const { data: recentVisits } = useQuery({
    queryKey: ['admin-recent-visits'],
    queryFn: async () => {
      const { data, error } = await supabase.from('page_visits').select('id, page_path, referrer, country, created_at, visitor_id, is_new_visitor, device_type, browser').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

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
      return { total: total.count ?? 0, storeViews: storeViews.count ?? 0, productViews: productViews.count ?? 0, uniqueStores: uniqueStoreIds.size };
    },
  });

  const { data: sellerEventTypes } = useQuery({
    queryKey: ['admin-seller-event-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seller_analytics').select('event_type');
      if (error) throw error;
      const eventCount: Record<string, number> = {};
      data?.forEach(e => { const type = e.event_type || 'unknown'; eventCount[type] = (eventCount[type] || 0) + 1; });
      return Object.entries(eventCount).map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value }));
    },
  });

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
        result.push({ date: format(date, days <= 7 ? 'EEE' : 'MMM d'), storeViews: storeViews.count ?? 0, productViews: productViews.count ?? 0 });
      }
      return result;
    },
  });

  const { data: topStores } = useQuery({
    queryKey: ['admin-top-stores'],
    queryFn: async () => {
      const { data: analytics, error } = await supabase.from('seller_analytics').select('store_id');
      if (error) throw error;
      const storeCount: Record<string, number> = {};
      analytics?.forEach(a => { if (a.store_id) { storeCount[a.store_id] = (storeCount[a.store_id] || 0) + 1; } });
      const topStoreIds = Object.entries(storeCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
      if (topStoreIds.length === 0) return [];
      const { data: stores } = await supabase.from('stores').select('id, name, logo_url').in('id', topStoreIds);
      return topStoreIds.map(id => {
        const store = stores?.find(s => s.id === id);
        return { id, name: store?.name || 'Unknown Store', logo_url: store?.logo_url, views: storeCount[id] };
      });
    },
  });

  const { data: sellerDeviceStats } = useQuery({
    queryKey: ['admin-seller-device-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seller_analytics').select('device_type');
      if (error) throw error;
      const deviceCount: Record<string, number> = {};
      data?.forEach(v => { const device = v.device_type || 'unknown'; deviceCount[device] = (deviceCount[device] || 0) + 1; });
      return Object.entries(deviceCount).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: referralStats } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: async () => {
      const [totalClicks, uniqueReferrers, referrals] = await Promise.all([
        supabase.from('referral_clicks').select('id', { count: 'exact', head: true }),
        supabase.from('referral_clicks').select('referrer_id'),
        supabase.from('referrals').select('id', { count: 'exact', head: true }),
      ]);
      const uniqueReferrerIds = new Set(uniqueReferrers.data?.map(r => r.referrer_id) || []);
      return { totalClicks: totalClicks.count ?? 0, uniqueReferrers: uniqueReferrerIds.size, conversions: referrals.count ?? 0 };
    },
  });

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

  const { data: topReferrers } = useQuery({
    queryKey: ['admin-top-referrers'],
    queryFn: async () => {
      const { data: clicks, error } = await supabase.from('referral_clicks').select('referrer_id, referral_code');
      if (error) throw error;
      const referrerCount: Record<string, { clicks: number; code: string }> = {};
      clicks?.forEach(c => {
        if (c.referrer_id) {
          if (!referrerCount[c.referrer_id]) referrerCount[c.referrer_id] = { clicks: 0, code: c.referral_code || '' };
          referrerCount[c.referrer_id].clicks += 1;
        }
      });
      const topReferrerIds = Object.keys(referrerCount).slice(0, 10);
      if (topReferrerIds.length === 0) return [];
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', topReferrerIds);
      return Object.entries(referrerCount)
        .sort((a, b) => b[1].clicks - a[1].clicks)
        .slice(0, 10)
        .map(([id, data]) => {
          const profile = profiles?.find(p => p.user_id === id);
          return { id, name: profile?.display_name || 'Unknown', avatar_url: profile?.avatar_url, code: data.code, clicks: data.clicks };
        });
    },
  });

  const { data: recentReferrals } = useQuery({
    queryKey: ['admin-recent-referrals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('referral_clicks').select('id, referrer_id, referral_code, user_agent, created_at').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

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

  const { data: countryStats } = useQuery({
    queryKey: ['admin-country-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('page_visits').select('country').limit(1000);
      const countryCount: Record<string, number> = {};
      (data as any[])?.forEach(v => { const country = v.country || 'Unknown'; countryCount[country] = (countryCount[country] || 0) + 1; });
      return Object.entries(countryCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    },
  });

  return {
    stats, productDownloads, downloadTrend, orderTrend, categoryStats, userTrend,
    pageVisitStats, pageVisitsByPage, deviceStats, browserStats, visitTrend, recentVisits,
    sellerAnalyticsStats, sellerEventTypes, sellerAnalyticsTrend, topStores, sellerDeviceStats,
    referralStats, referralTrend, topReferrers, recentReferrals,
    currentPeriodStats, previousPeriodStats, countryStats,
    days,
  };
}
