import { useState, useEffect } from 'react';
import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Shield, Users, Trash2, Plus, Server, Crown, Eye, Settings2 } from 'lucide-react';
import { useGlobalGuardSession } from '@/hooks/useGlobalGuardSession';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface GuildPermission {
  id: string;
  owner_user_id: string;
  guild_id: string;
  guild_name: string | null;
  discord_role_id: string;
  discord_role_name: string | null;
  permission_level: 'viewer' | 'manager' | 'admin';
  created_at: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

const PERMISSION_LEVELS = [
  { value: 'viewer', label: 'Viewer', description: 'Can view bans only', icon: Eye },
  { value: 'manager', label: 'Manager', description: 'Can add/remove bans', icon: Settings2 },
  { value: 'admin', label: 'Admin', description: 'Full access including settings', icon: Crown },
];

export default function GlobalGuardPermissions() {
  const { session, guilds } = useGlobalGuardSession();
  const queryClient = useQueryClient();
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('manager');
  const [guildRoles, setGuildRoles] = useState<DiscordRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Filter to only show guilds where user is owner or has admin permissions
  const ownedGuilds = guilds.filter(g => g.owner || (g.permissions & 0x8) === 0x8);

  // Fetch existing permissions
  const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['global-guard-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_guard_guild_permissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GuildPermission[];
    },
  });

  // Fetch Discord roles when guild is selected via backend function
  useEffect(() => {
    if (!selectedGuild) return;

    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        if (!session?.accessToken) {
          toast.error('Your Discord session expired — please sign in again');
          setGuildRoles([]);
          return;
        }

        const { data, error } = await supabase.functions.invoke('global-guard-fetch-roles', {
          body: {
            guildId: selectedGuild,
            discordAccessToken: session.accessToken,
          },
        });

        if (error) {
          console.error('Failed to fetch roles:', error);
          toast.error('Failed to fetch server roles');
          setGuildRoles([]);
          return;
        }

        if (!data?.success) {
          toast.error(data?.message || 'Unable to load roles for this server');
          setGuildRoles([]);
          return;
        }

        setGuildRoles(data.roles || []);
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        toast.error('Failed to fetch server roles');
        setGuildRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [selectedGuild, session?.accessToken]);

  // Add permission mutation
  const addPermission = useMutation({
    mutationFn: async () => {
      if (!selectedGuild || !selectedRole) {
        throw new Error('Please select a guild and role');
      }

      const guild = ownedGuilds.find(g => g.id === selectedGuild);
      const role = guildRoles.find(r => r.id === selectedRole);

      const { error } = await supabase
        .from('global_guard_guild_permissions')
        .insert({
          owner_user_id: session?.discordUser?.id,
          guild_id: selectedGuild,
          guild_name: guild?.name || null,
          discord_role_id: selectedRole,
          discord_role_name: role?.name || null,
          permission_level: selectedLevel,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This role already has permissions configured');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-guard-permissions'] });
      toast.success('Permission added successfully');
      setSelectedRole('');
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  // Remove permission mutation
  const removePermission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('global_guard_guild_permissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-guard-permissions'] });
      toast.success('Permission removed');
    },
    onError: () => {
      toast.error('Failed to remove permission');
    },
  });

  // Group permissions by guild
  const permissionsByGuild = permissions.reduce((acc, perm) => {
    if (!acc[perm.guild_id]) {
      acc[perm.guild_id] = [];
    }
    acc[perm.guild_id].push(perm);
    return acc;
  }, {} as Record<string, GuildPermission[]>);

  const getPermissionBadgeColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'viewer': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return '';
    }
  };

  return (
    <GlobalGuardLayout>
      <GlobalGuardHeader />
      
      <div className="space-y-6">
        {/* Add Permission Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-medium flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Role Permissions
            </CardTitle>
            <CardDescription>
              Configure which Discord roles can use Global Guard in your servers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Guild Select */}
              <Select value={selectedGuild || ''} onValueChange={setSelectedGuild}>
                <SelectTrigger>
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {ownedGuilds.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      <div className="flex items-center gap-2">
                        {guild.icon ? (
                          <img 
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <Server className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className="truncate">{guild.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Role Select */}
              <Select 
                value={selectedRole} 
                onValueChange={setSelectedRole}
                disabled={!selectedGuild || loadingRoles}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  {guildRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5' }}
                        />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                  {guildRoles.length === 0 && !loadingRoles && selectedGuild && (
                    <SelectItem value="_none" disabled>
                      No roles available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Permission Level Select */}
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <level.icon className="w-4 h-4" />
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Add Button */}
              <Button
                onClick={() => addPermission.mutate()}
                disabled={!selectedGuild || !selectedRole || addPermission.isPending}
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Permission
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>Viewer:</strong> Can view ban list • 
              <strong> Manager:</strong> Can add/remove bans • 
              <strong> Admin:</strong> Full access including settings
            </p>
          </CardContent>
        </Card>

        {/* Existing Permissions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Configured Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPermissions ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : Object.keys(permissionsByGuild).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No permissions configured yet</p>
                <p className="text-sm">Add roles above to let your staff use Global Guard</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(permissionsByGuild).map(([guildId, guildPerms]) => {
                  const guild = ownedGuilds.find(g => g.id === guildId);
                  return (
                    <div key={guildId} className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        {guild?.icon ? (
                          <img 
                            src={`https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png`}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <Server className="w-5 h-5" />
                        )}
                        {guildPerms[0].guild_name || guild?.name || 'Unknown Server'}
                      </div>
                      <div className="space-y-2 pl-7">
                        {guildPerms.map((perm) => (
                          <div 
                            key={perm.id}
                            className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{perm.discord_role_name || 'Unknown Role'}</span>
                              <Badge className={getPermissionBadgeColor(perm.permission_level)}>
                                {perm.permission_level}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePermission.mutate(perm.id)}
                              disabled={removePermission.isPending}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </GlobalGuardLayout>
  );
}
