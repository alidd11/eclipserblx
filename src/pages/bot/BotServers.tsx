import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-[hsl(258,90%,66%)]" />
              Connected Servers
              {guilds && <Badge className="bg-[hsl(258,90%,66%)]/20 text-[hsl(258,90%,76%)] border-[hsl(258,90%,66%)]/30 ml-2">{guilds.length}</Badge>}
            </h2>
            <p className="text-sm text-white/50 mt-1">All Discord servers the bot is connected to</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-white/40">Loading servers...</p>
        ) : !guilds?.length ? (
          <p className="text-sm text-white/40">No servers found</p>
        ) : (
          <div className="grid gap-3">
            {guilds.map((guild) => (
              <div key={guild.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors">
                {getIconUrl(guild) ? (
                  <img src={getIconUrl(guild)!} alt={guild.name} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <Server className="h-5 w-5 text-white/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{guild.name}</p>
                  <p className="text-xs text-white/40 font-mono">{guild.id}</p>
                </div>
                {(guild.approximate_member_count || guild.member_count) && (
                  <div className="flex items-center gap-1.5 text-sm text-white/50">
                    <Users className="h-4 w-4" />
                    {guild.approximate_member_count || guild.member_count}
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
