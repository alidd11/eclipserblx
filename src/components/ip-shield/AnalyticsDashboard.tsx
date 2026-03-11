import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Gavel, Radar, BarChart3, Zap } from 'lucide-react';

export function AnalyticsDashboard({ userId }: { userId?: string }) {
  const { data: stats } = useQuery({
    queryKey: ['ip-shield-analytics', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_shield_stats' as any)
        .select('*')
        .eq('creator_id', userId!)
        .single();
      if (error) return null;
      return data as any;
    },
    enabled: !!userId,
  });

  const { data: recentDetections } = useQuery({
    queryKey: ['recent-detections-count', userId],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('ip_copy_detections' as any)
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId!)
        .gte('created_at', sevenDaysAgo)
        .is('dismissed_at', null);
      return count || 0;
    },
    enabled: !!userId,
  });

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="border-destructive/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Active Threats</span>
          </div>
          <div className="text-2xl font-bold">{stats.active_detections || 0}</div>
          <div className="flex gap-1 mt-1">
            {stats.high_threat_count > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">🔴 {stats.high_threat_count}</Badge>}
            {stats.medium_threat_count > 0 && <Badge className="text-[10px] px-1.5 py-0">🟡 {stats.medium_threat_count}</Badge>}
            {stats.low_threat_count > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">🟢 {stats.low_threat_count}</Badge>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Takedowns Filed</span>
          </div>
          <div className="text-2xl font-bold">{stats.takedowns_filed || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Radar className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Unique Copies</span>
          </div>
          <div className="text-2xl font-bold">{stats.unique_copies_found || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Avg Similarity</span>
          </div>
          <div className="text-2xl font-bold">{Math.round(stats.avg_similarity || 0)}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">New This Week</span>
          </div>
          <div className="text-2xl font-bold">{recentDetections || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}
