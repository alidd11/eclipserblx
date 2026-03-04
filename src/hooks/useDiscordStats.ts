import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DiscordStats {
  approximate_member_count: number | null;
  approximate_presence_count: number | null;
  guild_name: string | null;
  guild_icon: string | null;
}

export function useDiscordStats() {
  const { data, isLoading } = useQuery<DiscordStats>({
    queryKey: ['discord-server-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('discord-server-stats');
      if (error) {
        console.error('Failed to fetch Discord stats:', error);
        return { approximate_member_count: null, approximate_presence_count: null, guild_name: null, guild_icon: null };
      }
      return data;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes — non-critical data
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on every component mount
  });

  return {
    memberCount: data?.approximate_member_count ?? null,
    onlineCount: data?.approximate_presence_count ?? null,
    guildName: data?.guild_name ?? null,
    guildIcon: data?.guild_icon ?? null,
    isLoading,
  };
}
