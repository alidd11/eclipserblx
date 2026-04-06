import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Wifi, WifiOff, Cpu, Gauge, Terminal, AlertTriangle, Server, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BotOverview() {
  const navigate = useNavigate();

  const { data: health, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['bot-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bot-control', {
        body: { action: 'bot-health' },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  const { data: errors = [] } = useQuery({
    queryKey: ['bot-error-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const getPingColor = (ping?: number) => {
    if (!ping || ping < 0) return 'text-foreground/50';
    if (ping < 100) return 'text-green-400';
    if (ping < 250) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <BotDashboardLayout>
      <div className="space-y-5 max-w-6xl mx-auto">
        {/* Page title — mobile only since sidebar is hidden */}
        <div className="flex items-center justify-between lg:hidden">
          <h1 className="text-lg font-bold text-foreground">Overview</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-foreground/60 hover:text-foreground hover:bg-background/10 h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Status Hero */}
        <div className="rounded-xl bg-gradient-to-r from-[hsl(258,90%,66%)]/20 to-[hsl(235,86%,60%)]/10 border border-white/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {isLoading ? (
                <Skeleton className="h-7 w-24 bg-background/10 rounded-full" />
              ) : health?.online ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-3 py-1">
                  <Wifi className="h-3.5 w-3.5 mr-1.5" /> Online
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-sm px-3 py-1">
                  <WifiOff className="h-3.5 w-3.5 mr-1.5" /> Offline
                </Badge>
              )}
              {health?.node && (
                <span className="text-xs text-foreground/40 font-mono">{health.node}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-foreground/60 hover:text-foreground hover:bg-background/10 hidden lg:flex"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-background/5 border border-white/10 p-4">
                <Skeleton className="h-4 w-16 bg-background/10 mb-3" />
                <Skeleton className="h-6 w-20 bg-background/10" />
              </div>
            ))}
          </div>
        ) : health?.online ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Uptime', value: health.uptimeFormatted || formatUptime(health.uptime), icon: Terminal },
              { label: 'Servers', value: health.guilds ?? 'N/A', icon: Server },
              { label: 'Ping', value: health.ping && health.ping > 0 ? `${health.ping}ms` : 'N/A', icon: Gauge, color: getPingColor(health.ping) },
              { label: 'Memory', value: health.memory ? `${health.memory.heapUsed}/${health.memory.heapTotal}MB` : 'N/A', icon: Cpu },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-background/5 border border-white/10 p-4 hover:bg-background/[0.07] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4 text-foreground/40" />
                  <span className="text-xs text-foreground/50">{stat.label}</span>
                </div>
                <p className={`text-base sm:text-lg font-bold truncate ${stat.color || 'text-foreground'}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Command Stats */}
        {health?.stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Commands', value: health.stats.commandsProcessed?.toLocaleString() || '0', icon: Terminal },
              { label: 'Errors', value: health.stats.errorsLogged || 0, icon: AlertTriangle, color: health.stats.errorsLogged > 0 ? 'text-red-400' : '' },
              { label: 'Reconnects', value: health.stats.reconnects || 0, icon: RefreshCw },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-background/5 border border-white/10 p-3 sm:p-4 text-center hover:bg-background/[0.07] transition-colors">
                <stat.icon className="h-4 w-4 text-foreground/40 mx-auto mb-1.5" />
                <p className={`text-lg sm:text-xl font-bold ${stat.color || 'text-foreground'}`}>{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-foreground/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Button
            className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-foreground h-auto py-3 text-xs sm:text-sm"
            onClick={() => navigate('/bot/actions')}
          >
            <Zap className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="truncate">Send Message</span>
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-foreground hover:bg-background/10 h-auto py-3 text-xs sm:text-sm"
            onClick={() => navigate('/bot/servers')}
          >
            <Server className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="truncate">Servers</span>
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-foreground hover:bg-background/10 h-auto py-3 text-xs sm:text-sm"
            onClick={() => navigate('/bot/commands')}
          >
            <Terminal className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="truncate">Commands</span>
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-foreground hover:bg-background/10 h-auto py-3 text-xs sm:text-sm"
            onClick={() => navigate('/bot/settings')}
          >
            <AlertTriangle className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="truncate">Logs</span>
          </Button>
        </div>

        {/* Recent Errors */}
        {errors.length > 0 && (
          <div className="rounded-xl bg-background/5 border border-white/10 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground/80 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Recent Errors
            </h3>
            <div className="space-y-2">
              {errors.map((err: any) => (
                <div key={err.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] sm:text-xs text-red-400 border-red-500/30 bg-red-500/10">
                      {err.context}
                    </Badge>
                    <span className="text-[10px] sm:text-xs text-foreground/30 shrink-0">
                      {new Date(err.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-foreground/60 break-all line-clamp-2">{err.error_message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BotDashboardLayout>
  );
}
