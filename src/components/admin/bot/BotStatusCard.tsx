import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw, Wifi, WifiOff, Cpu, Gauge, Terminal, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthData {
 online: boolean;
 uptime?: number;
 uptimeFormatted?: string;
 guilds?: number;
 ping?: number;
 memory?: { heapUsed: number; heapTotal: number; rss: number };
 stats?: {
 commandsProcessed: number;
 errorsLogged: number;
 reconnects: number;
 lastError: { message: string; at: string } | null;
 startedAt: string;
 };
 node?: string;
 error?: string;
}

export function BotStatusCard() {
 const { data: health, isLoading, refetch, isFetching } = useQuery({
 queryKey: ['bot-health'],
 queryFn: async () => {
 const { data, error } = await supabase.functions.invoke('bot-control', {
 body: { action: 'bot-health' },
 });
 if (error) throw error;
 return data as HealthData;
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

 const getPingColor = (ping?: number) => {
 if (!ping || ping < 0) return 'text-muted-foreground';
 if (ping < 100) return 'text-green-500';
 if (ping < 250) return 'text-yellow-500';
 return 'text-red-500';
 };

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-3">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <Activity className="h-5 w-5" />
 Bot Status
 </h3>
 <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
 <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
 </Button>
 </div>
 <div className="p-4">
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
 {health?.node && (
 <span className="text-xs text-muted-foreground font-mono">{health.node}</span>
 )}
 </div>

 {health?.online && (
 <>
 <div className="grid grid-cols-2 gap-2">
 <div className="p-2.5 rounded-lg bg-muted/50">
 <p className="text-xs text-muted-foreground">Uptime</p>
 <p className="text-sm font-medium">{health.uptimeFormatted || formatUptime(health.uptime)}</p>
 </div>
 <div className="p-2.5 rounded-lg bg-muted/50">
 <p className="text-xs text-muted-foreground">Servers</p>
 <p className="text-sm font-medium">{health.guilds ?? 'N/A'}</p>
 </div>
 <div className="p-2.5 rounded-lg bg-muted/50">
 <p className="text-xs text-muted-foreground flex items-center gap-1">
 <Gauge className="h-3 w-3" /> Ping
 </p>
 <p className={`text-sm font-medium ${getPingColor(health.ping)}`}>
 {health.ping && health.ping > 0 ? `${health.ping}ms` : 'N/A'}
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-muted/50">
 <p className="text-xs text-muted-foreground flex items-center gap-1">
 <Cpu className="h-3 w-3" /> Memory
 </p>
 <p className="text-sm font-medium">
 {health.memory ? `${health.memory.heapUsed}/${health.memory.heapTotal}MB` : 'N/A'}
 </p>
 </div>
 </div>

 {health.stats && (
 <div className="grid grid-cols-3 gap-2">
 <div className="p-2.5 rounded-lg bg-muted/50 text-center">
 <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
 <Terminal className="h-3 w-3" /> Commands
 </p>
 <p className="text-sm font-medium">{health.stats.commandsProcessed.toLocaleString()}</p>
 </div>
 <div className="p-2.5 rounded-lg bg-muted/50 text-center">
 <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
 <AlertTriangle className="h-3 w-3" /> Errors
 </p>
 <p className={`text-sm font-medium ${health.stats.errorsLogged > 0 ? 'text-red-500' : ''}`}>
 {health.stats.errorsLogged}
 </p>
 </div>
 <div className="p-2.5 rounded-lg bg-muted/50 text-center">
 <p className="text-xs text-muted-foreground">Reconnects</p>
 <p className="text-sm font-medium">{health.stats.reconnects}</p>
 </div>
 </div>
 )}

 {health.stats?.lastError && (
 <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
 <p className="text-xs font-medium text-destructive">Last Error</p>
 <p className="text-xs text-muted-foreground truncate">{health.stats.lastError.message}</p>
 <p className="text-xs text-muted-foreground">
 {new Date(health.stats.lastError.at).toLocaleString()}
 </p>
 </div>
 )}
 </>
 )}

 {!health?.online && health?.error && (
 <p className="text-xs text-muted-foreground">{health.error}</p>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
