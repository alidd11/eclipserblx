import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ErrorLog {
 id: string;
 context: string;
 error_message: string;
 stack_trace: string | null;
 metadata: Record<string, unknown>;
 created_at: string;
}

export function BotErrorLogsCard() {
 const queryClient = useQueryClient();

 const { data: errors = [], isLoading, refetch, isFetching } = useQuery({
 queryKey: ['bot-error-logs'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('bot_error_logs')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(20);
 if (error) throw error;
 return data as ErrorLog[];
 },
 refetchInterval: 30000,
 });

 const clearLogs = useMutation({
 mutationFn: async () => {
 // Delete all logs older than now
 const { error } = await supabase
 .from('bot_error_logs')
 .delete()
 .lt('created_at', new Date().toISOString());
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['bot-error-logs'] });
 toast.success('Error logs cleared');
 },
 onError: (e: Error) => toast.error(e.message),
 });

 const formatTime = (iso: string) => {
 const d = new Date(iso);
 const now = new Date();
 const diffMs = now.getTime() - d.getTime();
 const diffMin = Math.floor(diffMs / 60000);
 if (diffMin < 1) return 'just now';
 if (diffMin < 60) return `${diffMin}m ago`;
 const diffHr = Math.floor(diffMin / 60);
 if (diffHr < 24) return `${diffHr}h ago`;
 return `${Math.floor(diffHr / 24)}d ago`;
 };

 const getContextBadgeColor = (context: string) => {
 if (context.includes('uncaught') || context.includes('unhandled')) return 'bg-red-500/10 text-red-500 border-red-500/30';
 if (context.includes('shard')) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
 return 'bg-muted text-muted-foreground';
 };

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-3">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <AlertTriangle className="h-5 w-5" />
 Error Logs
 {errors.length > 0 && (
 <Badge variant="destructive" className="ml-1">{errors.length}</Badge>
 )}
 </h3>
 <div className="flex gap-1">
 {errors.length > 0 && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => clearLogs.mutate()}
 disabled={clearLogs.isPending}
 className="text-destructive hover:text-destructive"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 )}
 <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
 <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
 </Button>
 </div>
 </div>
 <div className="p-4">
 {isLoading ? (
 <p className="text-sm text-muted-foreground">Loading...</p>
 ) : !errors.length ? (
 <div className="text-center py-6">
 <p className="text-sm text-muted-foreground">No errors logged \u2014 looking good! \u2705</p>
 </div>
 ) : (
 <div className="space-y-2 max-h-96 overflow-y-auto">
 {errors.map((err) => (
 <div key={err.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
 <div className="flex items-center justify-between gap-2">
 <Badge variant="outline" className={`text-xs ${getContextBadgeColor(err.context)}`}>
 {err.context}
 </Badge>
 <span className="text-xs text-muted-foreground shrink-0">{formatTime(err.created_at)}</span>
 </div>
 <p className="text-xs font-mono break-all">{err.error_message}</p>
 {err.metadata && Object.keys(err.metadata).length > 0 && (
 <div className="flex gap-2 flex-wrap">
 {Object.entries(err.metadata).map(([k, v]) => (
 <span key={k} className="text-xs text-muted-foreground">
 {k}: <span className="font-mono">{String(v)}</span>
 </span>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
