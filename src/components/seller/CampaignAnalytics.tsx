import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { RevolutLineChart } from '@/components/ui/revolut-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, eachDayOfInterval, parseISO } from '@/lib/dateUtils';

interface CampaignAnalyticsProps {
  campaignId: string;
  productSlug?: string;
  startedAt?: string | null;
  expiresAt?: string | null;
}

export function CampaignAnalytics({ campaignId, productSlug, startedAt, expiresAt }: CampaignAnalyticsProps) {
  const start = startedAt ? parseISO(startedAt) : subDays(new Date(), 30);
  const end = expiresAt ? parseISO(expiresAt) : new Date();

  // Fetch page visits for demographics
  const { data: visits, isLoading } = useQuery({
    queryKey: ['campaign-demographics', campaignId, productSlug],
    queryFn: async () => {
      if (!productSlug) return [];
      const { data, error } = await supabase
        .from('page_visits')
        .select('created_at, device_type, country')
        .eq('page_path', `/product/${productSlug}`)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!productSlug,
  });

  // Build device breakdown
  const deviceMap: Record<string, number> = {};
  const countryMap: Record<string, number> = {};
  const dailyMap: Record<string, number> = {};

  visits?.forEach(v => {
    const dev = v.device_type || 'Unknown';
    deviceMap[dev] = (deviceMap[dev] || 0) + 1;
    const country = v.country || 'Unknown';
    countryMap[country] = (countryMap[country] || 0) + 1;
    const day = format(parseISO(v.created_at), 'MMM d');
    dailyMap[day] = (dailyMap[day] || 0) + 1;
  });

  const deviceData = Object.entries(deviceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const countryData = Object.entries(countryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Fill daily chart
  const days = eachDayOfInterval({ start, end: end > new Date() ? new Date() : end });
  const dailyData = days.map(d => {
    const key = format(d, 'MMM d');
    return { date: key, visits: dailyMap[key] || 0 };
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!visits || visits.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No demographic data available yet. Data appears once your campaign starts receiving traffic.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/30 border-t border-border">
      <Card>
        <CardContent className="p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Device Breakdown</p>
          <RevolutDonutChart data={deviceData} height={160} innerRadius={35} outerRadius={60} showLegend />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Top Countries</p>
          <RevolutDonutChart data={countryData} height={160} innerRadius={35} outerRadius={60} showLegend />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Daily Traffic</p>
          <RevolutLineChart
            data={dailyData}
            xKey="date"
            series={[{ dataKey: 'visits', color: 'hsl(var(--primary))' }]}
            height={160}
            showYAxis={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
