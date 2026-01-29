import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, Server, Users, CheckCircle, Clock, ExternalLink, 
  Bot, Calendar, User, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface BotInstallation {
  id: string;
  product_name: string;
  guild_id: string | null;
  discord_guild_name: string | null;
  discord_guild_icon: string | null;
  discord_member_count: number | null;
  discord_invite: string | null;
  license_status: string;
  activated_at: string | null;
  created_at: string;
  user_id: string | null;
  profile?: {
    customer_id: string | null;
    display_name: string | null;
    email: string | null;
  } | null;
}

export default function BotServers() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all bot installations with guild data
  const { data: installations = [], isLoading } = useQuery({
    queryKey: ['bot-servers', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('bot_installation_codes')
        .select('*')
        .not('guild_id', 'is', null)
        .order('activated_at', { ascending: false, nullsFirst: false });

      if (searchQuery.trim()) {
        query = query.or(
          `discord_guild_name.ilike.%${searchQuery}%,product_name.ilike.%${searchQuery}%,guild_id.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Fetch profiles for installations with user_id
      const userIds = data?.filter(i => i.user_id).map(i => i.user_id) || [];
      let profileMap: Record<string, { customer_id: string | null; display_name: string | null; email: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, customer_id, display_name, email')
          .in('user_id', userIds);

        if (profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { customer_id: p.customer_id, display_name: p.display_name, email: p.email };
            return acc;
          }, {} as Record<string, { customer_id: string | null; display_name: string | null; email: string | null }>);
        }
      }

      return data?.map(install => ({
        ...install,
        profile: install.user_id ? profileMap[install.user_id] : null
      })) as BotInstallation[];
    },
  });

  // Stats
  const totalServers = installations.length;
  const activeServers = installations.filter(i => i.license_status === 'active').length;
  const uniqueBots = [...new Set(installations.map(i => i.product_name))].length;
  const totalMembers = installations.reduce((sum, i) => sum + (i.discord_member_count || 0), 0);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1">
        <Clock className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bot Servers</h1>
          <p className="text-muted-foreground">View all Discord servers with active bot installations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <AdminStatCard label="Total Servers" value={totalServers} />
          <AdminStatCard label="Active Licenses" value={activeServers} valueColor="green" />
          <AdminStatCard label="Unique Bots" value={uniqueBots} valueColor="primary" />
          <AdminStatCard label="Total Members" value={totalMembers.toLocaleString()} />
        </div>

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Search Servers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by server name, bot, or guild ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Server List */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : installations.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery ? 'No servers found matching your search' : 'No bot installations yet'}
              </CardContent>
            </Card>
          ) : (
            installations.map((install) => (
              <Card key={install.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 space-y-4">
                  {/* Server Header */}
                  <div className="flex items-start gap-3">
                    {install.discord_guild_icon ? (
                      <img
                        src={install.discord_guild_icon}
                        alt={install.discord_guild_name || 'Server'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Server className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {install.discord_guild_name || 'Unknown Server'}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {install.product_name}
                      </p>
                    </div>
                    {getStatusBadge(install.license_status)}
                  </div>

                  {/* Server Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {install.discord_member_count && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{install.discord_member_count.toLocaleString()} members</span>
                      </div>
                    )}
                    {install.activated_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDistanceToNow(new Date(install.activated_at), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Info */}
                  {install.profile && (
                    <div className="p-2 rounded-md bg-muted/50 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="font-medium">Customer</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-mono text-xs">{install.profile.customer_id || 'N/A'}</span>
                        {install.profile.display_name && (
                          <span className="text-muted-foreground"> • {install.profile.display_name}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Guild ID */}
                  {install.guild_id && (
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate font-mono">
                        {install.guild_id}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleCopy(install.guild_id!, 'Guild ID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Discord Invite */}
                  {install.discord_invite && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                      onClick={() => window.open(install.discord_invite!, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Join Server
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
