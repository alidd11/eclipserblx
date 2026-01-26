import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

interface Advertisement {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  posted_at: string | null;
  total_clicks: number | null;
  unique_clicks: number | null;
  last_clicked_at: string | null;
  link_url: string | null;
  price_paid: number | null;
  ping_price_paid: number | null;
  ping_type: string | null;
  user_id: string;
  discord_username: string | null;
}

interface ClickData {
  id: string;
  advertisement_id: string;
  clicked_at: string;
  device_type: string | null;
  referrer: string | null;
}

interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  billing_period: string | null;
  ads_used_this_month: number | null;
  everyone_pings_balance: number | null;
  here_pings_balance: number | null;
  created_at: string;
  current_period_end: string | null;
}

interface DailyData {
  date: string;
  clicks: number;
  revenue: number;
  adsPosted: number;
}

interface TierBreakdown {
  tier: string;
  count: number;
  percentage: number;
}

interface AdminAdSummary {
  totalAds: number;
  postedAds: number;
  pendingAds: number;
  totalClicks: number;
  uniqueClicks: number;
  totalRevenue: number;
  totalPingRevenue: number;
  activeSubscriptions: number;
  avgClicksPerAd: number;
}

export function useAdminAdAnalytics() {
  // Fetch all advertisements
  const { data: advertisements, isLoading: adsLoading } = useQuery({
    queryKey: ['admin-all-advertisements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discord_advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Advertisement[];
    },
  });

  // Fetch all advertisement clicks (last 30 days for performance)
  const { data: clicks, isLoading: clicksLoading } = useQuery({
    queryKey: ['admin-all-ad-clicks'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data, error } = await supabase
        .from('advertisement_clicks')
        .select('id, advertisement_id, clicked_at, device_type, referrer')
        .gte('clicked_at', thirtyDaysAgo)
        .order('clicked_at', { ascending: false });

      if (error) throw error;
      return data as ClickData[];
    },
  });

  // Fetch all subscriptions
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-ad-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advertisement_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Subscription[];
    },
  });

  // Calculate summary statistics
  const summary = useMemo((): AdminAdSummary => {
    if (!advertisements) {
      return {
        totalAds: 0,
        postedAds: 0,
        pendingAds: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        totalRevenue: 0,
        totalPingRevenue: 0,
        activeSubscriptions: 0,
        avgClicksPerAd: 0,
      };
    }

    const postedAds = advertisements.filter(ad => ad.status === 'posted');
    const pendingAds = advertisements.filter(ad => ad.status === 'paid');
    const totalClicks = advertisements.reduce((sum, ad) => sum + (ad.total_clicks || 0), 0);
    const uniqueClicks = advertisements.reduce((sum, ad) => sum + (ad.unique_clicks || 0), 0);
    const totalRevenue = advertisements.reduce((sum, ad) => sum + (ad.price_paid || 0), 0);
    const totalPingRevenue = advertisements.reduce((sum, ad) => sum + (ad.ping_price_paid || 0), 0);
    const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;

    return {
      totalAds: advertisements.length,
      postedAds: postedAds.length,
      pendingAds: pendingAds.length,
      totalClicks,
      uniqueClicks,
      totalRevenue,
      totalPingRevenue,
      activeSubscriptions,
      avgClicksPerAd: postedAds.length > 0 ? Math.round(totalClicks / postedAds.length) : 0,
    };
  }, [advertisements, subscriptions]);

  // Daily data for charts (last 30 days)
  const dailyData = useMemo((): DailyData[] => {
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    const dataByDate: Record<string, { clicks: number; revenue: number; adsPosted: number }> = {};
    
    last30Days.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      dataByDate[dateStr] = { clicks: 0, revenue: 0, adsPosted: 0 };
    });

    // Count clicks per day
    clicks?.forEach(click => {
      const dateStr = format(new Date(click.clicked_at), 'yyyy-MM-dd');
      if (dataByDate[dateStr]) {
        dataByDate[dateStr].clicks++;
      }
    });

    // Count revenue and ads posted per day
    advertisements?.forEach(ad => {
      if (ad.posted_at) {
        const dateStr = format(new Date(ad.posted_at), 'yyyy-MM-dd');
        if (dataByDate[dateStr]) {
          dataByDate[dateStr].adsPosted++;
          dataByDate[dateStr].revenue += (ad.price_paid || 0) + (ad.ping_price_paid || 0);
        }
      }
    });

    return last30Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayData = dataByDate[dateStr];
      return {
        date: format(date, 'MMM dd'),
        clicks: dayData?.clicks || 0,
        revenue: dayData?.revenue || 0,
        adsPosted: dayData?.adsPosted || 0,
      };
    });
  }, [clicks, advertisements]);

  // Subscription tier breakdown
  const tierBreakdown = useMemo((): TierBreakdown[] => {
    if (!subscriptions?.length) return [];

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const tierCounts: Record<string, number> = {};
    
    activeSubscriptions.forEach(sub => {
      tierCounts[sub.tier] = (tierCounts[sub.tier] || 0) + 1;
    });

    const total = activeSubscriptions.length;
    return Object.entries(tierCounts)
      .map(([tier, count]) => ({
        tier: tier.charAt(0).toUpperCase() + tier.slice(1),
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [subscriptions]);

  // Device breakdown from clicks
  const deviceBreakdown = useMemo(() => {
    if (!clicks?.length) return [];

    const deviceCounts: Record<string, number> = {};
    clicks.forEach(click => {
      const device = click.device_type || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    const total = clicks.length;
    return Object.entries(deviceCounts)
      .map(([device, count]) => ({
        device: device.charAt(0).toUpperCase() + device.slice(1),
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [clicks]);

  // Top performing ads
  const topPerformingAds = useMemo(() => {
    if (!advertisements?.length) return [];
    
    return [...advertisements]
      .filter(ad => ad.status === 'posted')
      .sort((a, b) => (b.total_clicks || 0) - (a.total_clicks || 0))
      .slice(0, 10);
  }, [advertisements]);

  // Recent ads
  const recentAds = useMemo(() => {
    if (!advertisements?.length) return [];
    return advertisements.slice(0, 10);
  }, [advertisements]);

  // Monthly revenue
  const monthlyRevenue = useMemo(() => {
    if (!advertisements?.length) return 0;
    
    const startOfThisMonth = startOfMonth(new Date());
    const endOfThisMonth = endOfMonth(new Date());
    
    return advertisements
      .filter(ad => {
        if (!ad.posted_at) return false;
        const postedDate = new Date(ad.posted_at);
        return postedDate >= startOfThisMonth && postedDate <= endOfThisMonth;
      })
      .reduce((sum, ad) => sum + (ad.price_paid || 0) + (ad.ping_price_paid || 0), 0);
  }, [advertisements]);

  return {
    advertisements,
    clicks,
    subscriptions,
    summary,
    dailyData,
    tierBreakdown,
    deviceBreakdown,
    topPerformingAds,
    recentAds,
    monthlyRevenue,
    isLoading: adsLoading || clicksLoading || subsLoading,
  };
}
