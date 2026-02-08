import { formatDistanceToNow } from 'date-fns';
import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { useGlobalGuardData } from '@/hooks/useGlobalGuardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Minus, 
  RefreshCw, 
  Clock,
  Shield
} from 'lucide-react';

export default function GlobalGuardHistory() {
  const { logs, isLoadingLogs } = useGlobalGuardData();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="w-4 h-4" />;
      case 'revoked':
        return <Minus className="w-4 h-4" />;
      case 'synced':
        return <RefreshCw className="w-4 h-4" />;
      case 'expired':
        return <Clock className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'revoked':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'synced':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'expired':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <GlobalGuardLayout>
      <GlobalGuardHeader />
      
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Activity History</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Audit log of all ban-related actions
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(log.action)}>
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </Badge>
                      {log.guild_id && (
                        <span className="text-xs text-muted-foreground">
                          in server {log.guild_id}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ban ID: <code className="text-xs bg-muted px-1 rounded">{log.ban_id.slice(0, 8)}...</code>
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </GlobalGuardLayout>
  );
}
