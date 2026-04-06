import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DiscordGuild {
 id: string;
 name: string;
 icon: string | null;
 member_count?: number;
 approximate_member_count?: number;
}

export function BotServersCard() {
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
 guild.icon
 ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
 : null;

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-3">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <Server className="h-5 w-5" />
 Connected Servers
 {guilds && (
 <Badge variant="secondary" className="ml-1">{guilds.length}</Badge>
 )}
 </h3>
 <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
 <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
 </Button>
 </div>
 <div className="p-4">
 {isLoading ? (
 <p className="text-sm text-muted-foreground">Loading servers...</p>
 ) : !guilds?.length ? (
 <p className="text-sm text-muted-foreground">No servers found</p>
 ) : (
 <div className="space-y-2 max-h-80 overflow-y-auto">
 {guilds.map((guild) => (
 <div
 key={guild.id}
 className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
 >
 {getIconUrl(guild) ? (
 <img
 src={getIconUrl(guild)!}
 alt={guild.name}
 className="w-8 h-8 rounded-full"
 />
 ) : (
 <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
 <Server className="h-4 w-4 text-muted-foreground" />
 </div>
 )}
 <div className="flex-1 min-w-0">
 <p className="font-medium text-sm truncate">{guild.name}</p>
 <p className="text-xs text-muted-foreground font-mono">{guild.id}</p>
 </div>
 {(guild.approximate_member_count || guild.member_count) && (
 <div className="flex items-center gap-1 text-xs text-muted-foreground">
 <Users className="h-3 w-3" />
 {guild.approximate_member_count || guild.member_count}
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
