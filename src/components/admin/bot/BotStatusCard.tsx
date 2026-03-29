import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function BotStatusCard() {
  const { data: health, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['bot-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bot-control', {
        body: { action: 'bot-health' },
      });
      if (error) throw error;
      return data as { online: boolean; uptime?: number; guilds?: number; error?: string };
    },
    refetchInterval: 60000,
  });

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Bot Status
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking status...</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {health?.online ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                  <Wifi className="h-3 w-3 mr-1" /> Online
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <WifiOff className="h-3 w-3 mr-1" /> Offline
                </Badge>
              )}
            </div>
            {health?.online && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-sm font-medium">{formatUptime(health.uptime)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Servers</p>
                  <p className="text-sm font-medium">{health.guilds ?? 'N/A'}</p>
                </div>
              </div>
            )}
            {!health?.online && health?.error && (
              <p className="text-xs text-muted-foreground">{health.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
