import { Server, Users, CheckCircle, AlertCircle, Clock, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ConnectedServer } from '@/types/global-guard';

interface ServerOverviewProps {
  servers: ConnectedServer[];
  isLoading?: boolean;
  disabled?: boolean;
}

export function ServerOverview({ servers, isLoading, disabled }: ServerOverviewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Server className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No Servers Connected</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Purchase and activate a bot license to start protecting your servers with Global Guard.
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string | null) => {
    if (disabled) return <Lock className="w-4 h-4 text-muted-foreground" />;
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (disabled) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Locked</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">Active</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">Pending</Badge>;
      default:
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Inactive</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {servers.map((server) => (
        <Card 
          key={server.guild_id} 
          className={cn(
            "bg-card border-border transition-colors",
            disabled ? "opacity-60" : "hover:border-primary/30"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12 rounded-xl">
                <AvatarImage 
                  src={server.guild_icon 
                    ? `https://cdn.discordapp.com/icons/${server.guild_id}/${server.guild_icon}.png` 
                    : undefined
                  } 
                />
                <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
                  <Server className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-foreground truncate">
                    {server.guild_name || 'Unknown Server'}
                  </h3>
                  {getStatusIcon(server.license_status)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {server.member_count?.toLocaleString() || '?'} members
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {getStatusBadge(server.license_status)}
                  {server.last_synced_at && !disabled && (
                    <span className="text-xs text-muted-foreground">
                      Last sync: {new Date(server.last_synced_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
