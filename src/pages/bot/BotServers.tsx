import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Server, Users } from 'lucide-react';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  member_count?: number;
  approximate_member_count?: number;
}

export default function BotServers() {
  const { data: guilds, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['bot-guilds'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bot-control', {
        body: { action: 'list-guilds' },
      });
      if (error) throw error;
      return (data?.guilds || []) as DiscordGuild[];
    },
  });

  const getIconUrl = (guild: DiscordGuild) =>
    guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64` : null;

  return (
    <BotDashboardLayout>
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Server className="h-5 w-5 text-[hsl(258,90%,66%)] shrink-0" />
              <span className="truncate">Connected Servers</span>
              {guilds && (
                <Badge className="bg-[hsl(258,90%,66%)]/20 text-[hsl(258,90%,76%)] border-[hsl(258,90%,66%)]/30 shrink-0">
                  {guilds.length}
                </Badge>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-foreground/50 mt-1">All Discord servers the bot is connected to</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-foreground/60 hover:text-foreground hover:bg-background/10 shrink-0 h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-background/5 border border-white/10">
                <Skeleton className="w-12 h-12 rounded-full bg-background/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-background/10" />
                  <Skeleton className="h-3 w-48 bg-background/10" />
                </div>
              </div>
            ))}
          </div>
        ) : !guilds?.length ? (
          <div className="text-center py-16">
            <Server className="h-10 w-10 mx-auto mb-3 text-foreground/20" />
            <p className="text-sm text-foreground/40">No servers found</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-3">
            {guilds.map((guild) => (
              <div key={guild.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-background/5 border border-white/10 hover:bg-background/[0.07] transition-colors">
                {getIconUrl(guild) ? (
                  <img src={getIconUrl(guild)!} alt={guild.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/10 flex items-center justify-center shrink-0">
                    <Server className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm sm:text-base truncate">{guild.name}</p>
                  <p className="text-[10px] sm:text-xs text-foreground/40 font-mono truncate">{guild.id}</p>
                </div>
                {(guild.approximate_member_count || guild.member_count) && (
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-foreground/50 shrink-0">
                    <Users className="h-3.5 w-3.5" />
                    {(guild.approximate_member_count || guild.member_count)?.toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BotDashboardLayout>
  );
}
