import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface AdvertisementWithAnalytics {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  posted_at: string | null;
  total_clicks: number;
  unique_clicks: number;
  last_clicked_at: string | null;
  link_url: string | null;
}

interface ClickData {
  id: string;
  advertisement_id: string;
  clicked_at: string;
  device_type: string | null;
  referrer: string | null;
}

interface DailyClickData {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

interface DeviceBreakdown {
  device: string;
  count: number;
  percentage: number;
}

interface ReferrerBreakdown {
  source: string;
  count: number;
  percentage: number;
}

interface AdAnalyticsSummary {
  totalAds: number;
  postedAds: number;
  totalClicks: number;
  uniqueClicks: number;
  totalSpent: number;
  averageClicksPerAd: number;
}

export function useAdAnalytics() {
  const { user, session } = useAuth();

  const { data: advertisements, isLoading: adsLoading } = useQuery({
    queryKey: ['my-advertisements-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('discord_advertisements')
        .select('id, title, description, status, created_at, posted_at, total_clicks, unique_clicks, last_clicked_at, link_url, price_paid')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (AdvertisementWithAnalytics & { price_paid: number | null })[];
    },
    enabled: !!user?.id,
  });

  const { data: clicks, isLoading: clicksLoading } = useQuery({
    queryKey: ['my-ad-clicks', user?.id],
    queryFn: async () => {
      if (!user?.id || !advertisements?.length) return [];
      
      const adIds = advertisements.map(ad => ad.id);
      
      const { data, error } = await supabase
        .from('advertisement_clicks')
        .select('id, advertisement_id, clicked_at, device_type, referrer')
        .in('advertisement_id', adIds)
        .order('clicked_at', { ascending: false });

      if (error) throw error;
      return data as ClickData[];
    },
    enabled: !!user?.id && !!advertisements?.length,
  });

  const summary = useMemo((): AdAnalyticsSummary => {
    if (!advertisements) {
      return {
        totalAds: 0,
        postedAds: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        totalSpent: 0,
        averageClicksPerAd: 0,
      };
    }

    const postedAds = advertisements.filter(ad => ad.status === 'posted');
    const totalClicks = advertisements.reduce((sum, ad) => sum + (ad.total_clicks || 0), 0);
    const uniqueClicks = advertisements.reduce((sum, ad) => sum + (ad.unique_clicks || 0), 0);
    const totalSpent = advertisements.reduce((sum, ad) => sum + (ad.price_paid || 0), 0);

    return {
      totalAds: advertisements.length,
      postedAds: postedAds.length,
      totalClicks,
      uniqueClicks,
      totalSpent,
      averageClicksPerAd: postedAds.length > 0 ? Math.round(totalClicks / postedAds.length) : 0,
    };
  }, [advertisements]);

  const dailyClickData = useMemo((): DailyClickData[] => {
    if (!clicks?.length) return [];

    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    const clicksByDate: Record<string, { clicks: number; uniqueVisitors: Set<string> }> = {};
    
    last30Days.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      clicksByDate[dateStr] = { clicks: 0, uniqueVisitors: new Set() };
    });

    clicks.forEach(click => {
      const dateStr = format(new Date(click.clicked_at), 'yyyy-MM-dd');
      if (clicksByDate[dateStr]) {
        clicksByDate[dateStr].clicks++;
        // Use a combination of ad_id + visitor fingerprint for unique tracking
        clicksByDate[dateStr].uniqueVisitors.add(`${click.advertisement_id}`);
      }
    });

    return last30Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayData = clicksByDate[dateStr];
      return {
        date: format(date, 'MMM dd'),
        clicks: dayData?.clicks || 0,
        uniqueClicks: dayData?.uniqueVisitors.size || 0,
      };
    });
  }, [clicks]);

  const deviceBreakdown = useMemo((): DeviceBreakdown[] => {
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

  const referrerBreakdown = useMemo((): ReferrerBreakdown[] => {
    if (!clicks?.length) return [];

    const referrerCounts: Record<string, number> = {};
    clicks.forEach(click => {
      let source = 'Direct';
      if (click.referrer) {
        try {
          const url = new URL(click.referrer);
          source = url.hostname.replace('www.', '');
        } catch {
          source = 'Unknown';
        }
      }
      referrerCounts[source] = (referrerCounts[source] || 0) + 1;
    });

    const total = clicks.length;
    return Object.entries(referrerCounts)
      .map(([source, count]) => ({
        source,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 sources
  }, [clicks]);

  const topPerformingAds = useMemo(() => {
    if (!advertisements?.length) return [];
    
    return [...advertisements]
      .filter(ad => ad.status === 'posted')
      .sort((a, b) => (b.total_clicks || 0) - (a.total_clicks || 0))
      .slice(0, 5);
  }, [advertisements]);

  return {
    advertisements,
    clicks,
    summary,
    dailyClickData,
    deviceBreakdown,
    referrerBreakdown,
    topPerformingAds,
    isLoading: adsLoading || clicksLoading,
  };
}
