import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    if (!ping || ping < 0) return 'text-white/50';
    if (ping < 100) return 'text-green-400';
    if (ping < 250) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <BotDashboardLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Status Hero */}
        <div className="rounded-xl bg-gradient-to-r from-[hsl(258,90%,66%)]/20 to-[hsl(235,86%,60%)]/10 border border-white/10 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {health?.online ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-3 py-1">
                  <Wifi className="h-3.5 w-3.5 mr-1.5" /> Online
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-sm px-3 py-1">
                  <WifiOff className="h-3.5 w-3.5 mr-1.5" /> Offline
                </Badge>
              )}
              {health?.node && (
                <span className="text-xs text-white/40 font-mono">{health.node}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {!isLoading && health?.online && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Uptime', value: health.uptimeFormatted || formatUptime(health.uptime), icon: Terminal },
              { label: 'Servers', value: health.guilds ?? 'N/A', icon: Server },
              { label: 'Ping', value: health.ping && health.ping > 0 ? `${health.ping}ms` : 'N/A', icon: Gauge, color: getPingColor(health.ping) },
              { label: 'Memory', value: health.memory ? `${health.memory.heapUsed}/${health.memory.heapTotal}MB` : 'N/A', icon: Cpu },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4 text-white/40" />
                  <span className="text-xs text-white/50">{stat.label}</span>
                </div>
                <p className={`text-lg font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Command Stats */}
        {health?.stats && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Commands Processed', value: health.stats.commandsProcessed?.toLocaleString() || '0', icon: Terminal },
              { label: 'Errors Logged', value: health.stats.errorsLogged || 0, icon: AlertTriangle, color: health.stats.errorsLogged > 0 ? 'text-red-400' : '' },
              { label: 'Reconnects', value: health.stats.reconnects || 0, icon: RefreshCw },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <stat.icon className="h-4 w-4 text-white/40 mx-auto mb-2" />
                <p className={`text-xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white h-auto py-3"
            onClick={() => navigate('/bot/actions')}
          >
            <Zap className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 h-auto py-3"
            onClick={() => navigate('/bot/servers')}
          >
            <Server className="h-4 w-4 mr-2" />
            Servers
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 h-auto py-3"
            onClick={() => navigate('/bot/commands')}
          >
            <Terminal className="h-4 w-4 mr-2" />
            Commands
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 h-auto py-3"
            onClick={() => navigate('/bot/settings')}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Logs
          </Button>
        </div>

        {/* Recent Errors */}
        {errors.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Recent Errors
            </h3>
            <div className="space-y-2">
              {errors.map((err: any) => (
                <div key={err.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-xs text-red-400 border-red-500/30 bg-red-500/10">
                      {err.context}
                    </Badge>
                    <span className="text-xs text-white/30">
                      {new Date(err.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-white/60 break-all">{err.error_message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BotDashboardLayout>
  );
}
