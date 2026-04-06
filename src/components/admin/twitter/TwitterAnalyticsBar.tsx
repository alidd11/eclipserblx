import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart2, Clock, Zap, Send, AlertTriangle, TrendingUp } from 'lucide-react';

interface XTheme {
  text: string;
  textSecondary: string;
  border: string;
  trendBg: string;
  accent: string;
  [key: string]: string;
}

interface KPI {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  color: string;
}

export function TwitterAnalyticsBar({ xTheme }: { xTheme: XTheme }) {
  const { data: stats } = useQuery({
    queryKey: ['twitter-kpi-stats'],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [allTime, last30, last7, queued, failed] = await Promise.all([
        supabase.from('twitter_posts').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
        supabase.from('twitter_posts').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('posted_at', thirtyDaysAgo.toISOString()),
        supabase.from('twitter_posts').select('posted_at', { count: 'exact' }).eq('status', 'sent').gte('posted_at', sevenDaysAgo.toISOString()),
        supabase.from('twitter_posts').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
        supabase.from('twitter_posts').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      ]);

      // Calculate best posting hour from last 30 days
      const { data: recentPosts } = await supabase
        .from('twitter_posts')
        .select('posted_at')
        .eq('status', 'sent')
        .gte('posted_at', thirtyDaysAgo.toISOString())
        .order('posted_at', { ascending: false })
        .limit(100);

      let bestHour = 'N/A';
      if (recentPosts && recentPosts.length > 0) {
        const hourCounts: Record<number, number> = {};
        recentPosts.forEach((p) => {
          if (p.posted_at) {
            const hour = new Date(p.posted_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          }
        });
        const topHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
        if (topHour) {
          const h = parseInt(topHour[0]);
          bestHour = `${h.toString().padStart(2, '0')}:00`;
        }
      }

      const dailyAvg = last7.count ? (last7.count / 7).toFixed(1) : '0';

      return {
        totalSent: allTime.count ?? 0,
        last30: last30.count ?? 0,
        dailyAvg,
        queued: queued.count ?? 0,
        failed: failed.count ?? 0,
        bestHour,
      };
    },
    staleTime: 120_000,
  });

  if (!stats) return null;

  const kpis: KPI[] = [
    { label: 'Total Posted', value: stats.totalSent, subtext: `${stats.last30} this month`, icon: Send, color: 'text-[#1d9bf0]' },
    { label: 'Daily Average', value: stats.dailyAvg, subtext: 'Last 7 days', icon: TrendingUp, color: 'text-[#00ba7c]' },
    { label: 'Best Hour', value: stats.bestHour, subtext: 'Most active', icon: Clock, color: 'text-[#ffd400]' },
    { label: 'In Queue', value: stats.queued, subtext: 'Pending approval', icon: Zap, color: 'text-[#1d9bf0]' },
    ...(stats.failed > 0
      ? [{ label: 'Failed', value: stats.failed, subtext: 'Needs attention', icon: AlertTriangle, color: 'text-[#f4212e]' }]
      : []),
  ];

  return (
    <div className={`${xTheme.border} border-b`}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <BarChart2 className={`h-4 w-4 ${xTheme.accent} shrink-0`} />
        <span className={`text-[13px] font-bold ${xTheme.text}`}>Analytics</span>
      </div>
      <div className="flex overflow-x-auto scrollbar-none">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`flex-1 min-w-[120px] px-4 py-3 ${xTheme.border} border-t`}>
            <div className="flex items-center gap-1.5 mb-1">
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
              <span className={`text-[11px] uppercase tracking-wide font-medium ${xTheme.textSecondary}`}>{kpi.label}</span>
            </div>
            <p className={`text-[22px] font-extrabold ${xTheme.text} leading-tight`}>{kpi.value}</p>
            {kpi.subtext && (
              <p className={`text-[11px] ${xTheme.textSecondary} mt-0.5`}>{kpi.subtext}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
