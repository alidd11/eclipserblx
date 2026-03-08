import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IPShieldLayout } from '@/components/ip-shield/IPShieldLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, Target, Gavel, Radar, BarChart3, Zap, FileText,
  Plus, Search, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

function AnalyticsDashboard({ userId }: { userId?: string }) {
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

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

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

export default function IPShieldOverview() {
  const { user } = useAuth();

  const { data: subscriptionStatus } = useIPShieldSubscription();

  const { data: registryCount } = useQuery({
    queryKey: ['ip-registry-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('creator_ip_registry')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: activeCases } = useQuery({
    queryKey: ['ip-shield-active-cases', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('takedown_requests' as any)
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user!.id)
        .not('status', 'in', '("resolved","rejected")');
      return count || 0;
    },
    enabled: !!user,
  });

  return (
    <IPShieldLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              IP Shield
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your intellectual property protection dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {subscriptionStatus?.tier && (
              <Badge variant="outline" className="capitalize">
                {subscriptionStatus.custom_plan ? 'Custom' : subscriptionStatus.tier} Plan
              </Badge>
            )}
          </div>
        </div>

        <AnalyticsDashboard userId={user?.id} />

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="hover:border-primary/30 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Gavel className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">Takedown Cases</h3>
                  <p className="text-xs text-muted-foreground">{activeCases || 0} active</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/ip-shield/dashboard/takedowns">
                  <Plus className="h-3.5 w-3.5 mr-1" /> View & File Takedowns
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/30 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">IP Registry</h3>
                  <p className="text-xs text-muted-foreground">{registryCount || 0} registered works</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/ip-shield/dashboard/registry">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Register & Manage
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/30 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Radar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Copy Detection</h3>
                  <p className="text-xs text-muted-foreground">AI-powered scanning</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/ip-shield/dashboard/detections">
                  <Search className="h-3.5 w-3.5 mr-1" /> Scan & Review
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </IPShieldLayout>
  );
}
