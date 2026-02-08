import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGlobalGuardSession } from '@/hooks/useGlobalGuardSession';
import type { GlobalBan, GlobalGuardStats, ConnectedServer, GlobalBanLog } from '@/types/global-guard';

export function useGlobalGuardData() {
  const queryClient = useQueryClient();
  const { session: ggSession } = useGlobalGuardSession();
  // Fetch all bans for current user
  const bansQuery = useQuery({
    queryKey: ['global-guard-bans'],
    queryFn: async (): Promise<GlobalBan[]> => {
      const { data, error } = await supabase
        .from('global_bans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as GlobalBan[];
    },
  });

  // Fetch stats
  const statsQuery = useQuery({
    queryKey: ['global-guard-stats'],
    queryFn: async (): Promise<GlobalGuardStats> => {
      const [bansResult, serversResult] = await Promise.all([
        supabase.from('global_bans').select('id, is_active, created_at'),
        supabase.from('bot_installation_codes').select('guild_id').not('guild_id', 'is', null),
      ]);

      if (bansResult.error) throw bansResult.error;
      
      const bans = bansResult.data || [];
      const servers = serversResult.data || [];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      return {
        totalBans: bans.length,
        activeBans: bans.filter((b) => b.is_active).length,
        serversProtected: new Set(servers.map((s) => s.guild_id)).size,
        recentBans: bans.filter((b) => new Date(b.created_at) > oneWeekAgo).length,
      };
    },
  });

  // Fetch connected servers
  const serversQuery = useQuery({
    queryKey: ['global-guard-servers', ggSession?.accessToken ? 'with-discord' : 'no-discord'],
    queryFn: async (): Promise<ConnectedServer[]> => {
      const { data, error } = await supabase
        .from('bot_installation_codes')
        .select('guild_id, discord_guild_name, discord_guild_icon, discord_member_count, license_status')
        .not('guild_id', 'is', null);

      if (error) throw error;

      // Deduplicate by guild_id
      const serversMap = new Map<string, ConnectedServer>();
      (data || []).forEach((s) => {
        if (s.guild_id && !serversMap.has(s.guild_id)) {
          serversMap.set(s.guild_id, {
            guild_id: s.guild_id,
            guild_name: s.discord_guild_name,
            guild_icon: s.discord_guild_icon,
            member_count: s.discord_member_count,
            license_status: s.license_status,
            last_synced_at: null,
          });
        }
      });

      const baseServers = Array.from(serversMap.values());

      // Enrich missing guild info (member counts/icons) from Discord when possible
      if (!ggSession?.accessToken || baseServers.length === 0) return baseServers;

      const guildIds = baseServers.map((s) => s.guild_id);
      const { data: enrichData, error: enrichError } = await supabase.functions.invoke(
        'global-guard-fetch-guild-info',
        {
          body: {
            guildIds,
            discordAccessToken: ggSession.accessToken,
          },
        }
      );

      if (enrichError || !enrichData?.success || !Array.isArray(enrichData?.guilds)) {
        return baseServers;
      }

      const byId = new Map<string, { guild_name: string; guild_icon: string | null; member_count: number | null }>();
      for (const g of enrichData.guilds as Array<{ guild_id: string; guild_name: string; guild_icon: string | null; member_count: number | null }>) {
        byId.set(g.guild_id, { guild_name: g.guild_name, guild_icon: g.guild_icon, member_count: g.member_count });
      }

      return baseServers.map((s) => {
        const extra = byId.get(s.guild_id);
        if (!extra) return s;
        return {
          ...s,
          guild_name: extra.guild_name ?? s.guild_name,
          guild_icon: extra.guild_icon ?? s.guild_icon,
          member_count: extra.member_count ?? s.member_count,
        };
      });
    },
  });
  // Fetch ban logs
  const logsQuery = useQuery({
    queryKey: ['global-guard-logs'],
    queryFn: async (): Promise<GlobalBanLog[]> => {
      const { data, error } = await supabase
        .from('global_ban_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as GlobalBanLog[];
    },
  });

  // Create ban mutation
  const createBanMutation = useMutation({
    mutationFn: async (banData: {
      discordId: string;
      username?: string;
      reason?: string;
      banType: 'permanent' | 'temporary';
      duration?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let expiresAt: string | null = null;
      if (banData.banType === 'temporary' && banData.duration) {
        const now = new Date();
        const durationMap: Record<string, number> = {
          '1h': 60 * 60 * 1000,
          '12h': 12 * 60 * 60 * 1000,
          '1d': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '90d': 90 * 24 * 60 * 60 * 1000,
        };
        expiresAt = new Date(now.getTime() + (durationMap[banData.duration] || 0)).toISOString();
      }

      const { data, error } = await supabase
        .from('global_bans')
        .insert({
          owner_user_id: user.id,
          banned_discord_id: banData.discordId,
          banned_username: banData.username || null,
          reason: banData.reason || null,
          ban_type: banData.banType,
          expires_at: expiresAt,
          created_via: 'dashboard',
        })
        .select()
        .single();

      if (error) throw error;

      // Create log entry
      await supabase.from('global_ban_logs').insert({
        ban_id: data.id,
        action: 'created',
        performed_by: user.id,
        details: { via: 'dashboard', ban_type: banData.banType },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-guard-bans'] });
      queryClient.invalidateQueries({ queryKey: ['global-guard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['global-guard-logs'] });
      toast.success('Ban created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create ban: ' + (error as Error).message);
    },
  });

  // Revoke ban mutation
  const revokeBanMutation = useMutation({
    mutationFn: async (banId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('global_bans')
        .update({ is_active: false })
        .eq('id', banId);

      if (error) throw error;

      // Create log entry
      await supabase.from('global_ban_logs').insert({
        ban_id: banId,
        action: 'revoked',
        performed_by: user.id,
        details: { via: 'dashboard' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-guard-bans'] });
      queryClient.invalidateQueries({ queryKey: ['global-guard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['global-guard-logs'] });
      toast.success('Ban revoked successfully');
    },
    onError: (error) => {
      toast.error('Failed to revoke ban: ' + (error as Error).message);
    },
  });

  // Delete ban mutation
  const deleteBanMutation = useMutation({
    mutationFn: async (banId: string) => {
      const { error } = await supabase
        .from('global_bans')
        .delete()
        .eq('id', banId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-guard-bans'] });
      queryClient.invalidateQueries({ queryKey: ['global-guard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['global-guard-logs'] });
      toast.success('Ban deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete ban: ' + (error as Error).message);
    },
  });

  return {
    bans: bansQuery.data || [],
    stats: statsQuery.data || { totalBans: 0, activeBans: 0, serversProtected: 0, recentBans: 0 },
    servers: serversQuery.data || [],
    logs: logsQuery.data || [],
    isLoading: bansQuery.isLoading || statsQuery.isLoading,
    isLoadingServers: serversQuery.isLoading,
    isLoadingLogs: logsQuery.isLoading,
    createBan: createBanMutation.mutateAsync,
    revokeBan: revokeBanMutation.mutate,
    deleteBan: deleteBanMutation.mutate,
    isCreatingBan: createBanMutation.isPending,
  };
}
