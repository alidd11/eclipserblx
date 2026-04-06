import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface DeliveryLog {
  id: string;
  event: string;
  status_code: number | null;
  response_body: string | null;
  latency_ms: number | null;
  attempt_number: number;
  error_message: string | null;
  created_at: string;
}

interface WebhookDeliveryLogsProps {
  webhookId: string;
}

export function WebhookDeliveryLogs({ webhookId }: WebhookDeliveryLogsProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['webhook-delivery-logs', webhookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_delivery_logs' as any)
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as DeliveryLog[];
    },
    enabled: expanded,
  });

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/20 transition-colors"
      >
        <span>Delivery History</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : !logs?.length ? (
            <p className="text-xs text-muted-foreground py-2">No deliveries yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {logs.map((log) => {
                const isSuccess = log.status_code && log.status_code >= 200 && log.status_code < 300;
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 text-xs py-1.5 border-b border-border/50 last:border-0"
                  >
                    <Badge
                      variant={isSuccess ? 'outline' : 'destructive'}
                      className="text-[10px] tabular-nums shrink-0"
                    >
                      {log.status_code || 'ERR'}
                    </Badge>
                    <span className="text-muted-foreground truncate flex-1">{log.event}</span>
                    {log.latency_ms && (
                      <span className="text-muted-foreground tabular-nums shrink-0">{log.latency_ms}ms</span>
                    )}
                    {log.attempt_number > 1 && (
                      <Badge variant="outline" className="text-[10px]">retry #{log.attempt_number}</Badge>
                    )}
                    <span className="text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                    {log.error_message && (
                      <span className="text-destructive truncate max-w-[120px]" title={log.error_message}>
                        {log.error_message}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
