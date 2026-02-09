import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { ServerOverview } from '@/components/global-guard/ServerOverview';
import { ServerSettingsCard } from '@/components/global-guard/ServerSettingsCard';
import { UpgradeBanner } from '@/components/global-guard/UpgradeBanner';
import { TierBadge } from '@/components/global-guard/TierBadge';
import { useGlobalGuardData } from '@/hooks/useGlobalGuardData';
import { useGlobalGuardLimits } from '@/hooks/useGlobalGuardLimits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function GlobalGuardServers() {
  const { servers, isLoadingServers } = useGlobalGuardData();
  const { data: limits, isLoadingLimits } = useGlobalGuardLimits();
  const isPremium = limits?.isPremium ?? false;
  const maxServers = limits?.maxServers;
  
  // For free users, only show first N servers as "active"
  const activeServers = isPremium || maxServers === null 
    ? servers 
    : servers.slice(0, maxServers);
  const limitedServers = !isPremium && maxServers !== null 
    ? servers.slice(maxServers) 
    : [];

  const handleSyncNow = async (guildId: string) => {
    try {
      await supabase.functions.invoke('sync-global-bans', {
        body: { guild_id: guildId, action: 'full_sync' },
      });
      toast.success('Sync initiated for server');
    } catch {
      toast.error('Failed to sync');
    }
  };

  const handleRemoveServer = async (guildId: string) => {
    toast.info('Server removal coming soon');
  };

  const handleSettingsChange = async (guildId: string, settings: any) => {
    toast.success('Settings saved');
  };

  return (
    <GlobalGuardLayout>
      <div className="flex items-center justify-between mb-2">
        <GlobalGuardHeader />
        <TierBadge isPremium={isPremium} />
      </div>
      
      {/* Upgrade Banner */}
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
                  ? 'Click a server to configure its protection settings'
                  : `Bans sync to ${maxServers} servers on your tier`
                }
              </p>
            </div>
            <Badge variant="outline">
              {activeServers.length}{!isPremium && maxServers ? `/${maxServers}` : ''} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="settings">Server Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <ServerOverview servers={activeServers} isLoading={isLoadingServers} />
              
              {limitedServers.length > 0 && (
                <div className="pt-4 border-t border-border mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Not syncing ({limitedServers.length} servers) — Upgrade to enable
                  </h4>
                  <ServerOverview servers={limitedServers} isLoading={false} disabled />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings">
              {isLoadingServers ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : activeServers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No servers connected yet
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeServers.map((server) => (
                    <ServerSettingsCard
                      key={server.guild_id}
                      server={server}
                      onSettingsChange={handleSettingsChange}
                      onRemoveServer={handleRemoveServer}
                      onSyncNow={handleSyncNow}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </GlobalGuardLayout>
  );
}
