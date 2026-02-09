import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { ServerOverview } from '@/components/global-guard/ServerOverview';
import { UpgradeBanner } from '@/components/global-guard/UpgradeBanner';
import { TierBadge } from '@/components/global-guard/TierBadge';
import { useGlobalGuardData } from '@/hooks/useGlobalGuardData';
import { useGlobalGuardLimits } from '@/hooks/useGlobalGuardLimits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function GlobalGuardServers() {
  const { servers, isLoadingServers } = useGlobalGuardData();
  const { data: limits, isLoadingLimits } = useGlobalGuardLimits();
  const isPremium = limits?.isPremium ?? false;
  const maxServers = limits?.maxServers;
  
  // For free users, only show first 2 servers as "active"
  const activeServers = isPremium || maxServers === null 
    ? servers 
    : servers.slice(0, maxServers);
  const limitedServers = !isPremium && maxServers !== null 
    ? servers.slice(maxServers) 
    : [];

  return (
    <GlobalGuardLayout>
      <div className="flex items-center justify-between mb-2">
        <GlobalGuardHeader />
        <TierBadge isPremium={isPremium} />
      </div>
      
      {/* Upgrade Banner - show for free users at limit OR anyone who might want more servers */}
      {!isLoadingLimits && (
        <div className="mb-6">
          <UpgradeBanner 
            currentServers={servers.length} 
            maxServers={maxServers} 
          />
        </div>
      )}
      
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-medium">Connected Servers</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isPremium 
                  ? 'Bans sync to all connected servers'
                  : `Bans sync to ${maxServers} servers on free tier`
                }
              </p>
            </div>
            <Badge variant="outline">
              {activeServers.length}{!isPremium && maxServers ? `/${maxServers}` : ''} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ServerOverview servers={activeServers} isLoading={isLoadingServers} />
          
          {limitedServers.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Not syncing ({limitedServers.length} servers) — Upgrade to enable
              </h4>
              <ServerOverview servers={limitedServers} isLoading={false} disabled />
            </div>
          )}
        </CardContent>
      </Card>
    </GlobalGuardLayout>
  );
}
