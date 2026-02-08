import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { ServerOverview } from '@/components/global-guard/ServerOverview';
import { useGlobalGuardData } from '@/hooks/useGlobalGuardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GlobalGuardServers() {
  const { servers, isLoadingServers } = useGlobalGuardData();

  return (
    <GlobalGuardLayout>
      <GlobalGuardHeader />
      
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Connected Servers</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Servers where your bot is installed and bans will be synchronized
          </p>
        </CardHeader>
        <CardContent>
          <ServerOverview servers={servers} isLoading={isLoadingServers} />
        </CardContent>
      </Card>
    </GlobalGuardLayout>
  );
}
