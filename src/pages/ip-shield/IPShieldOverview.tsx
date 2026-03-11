import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIPShieldSubscription } from '@/hooks/useIPShieldSubscription';
import { IPShieldLayout } from '@/components/ip-shield/IPShieldLayout';
import { AnalyticsDashboard } from '@/components/ip-shield/AnalyticsDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, FileText, Plus, Search, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
