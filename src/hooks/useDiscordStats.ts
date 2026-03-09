import { useQuery } from '@tanstack/react-query';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';

interface DiscordStats {
  approximate_member_count: number | null;
  approximate_presence_count: number | null;
  guild_name: string | null;
  guild_icon: string | null;
}

const DEFAULT_INVITE_CODE = 'eclipserblx';

export function useDiscordStats() {
  const { discordUrl } = useDiscordUrl();

  // Extract invite code from the URL
  const inviteCode = discordUrl?.split('/').pop() || DEFAULT_INVITE_CODE;

  const { data, isLoading } = useQuery<DiscordStats>({
    queryKey: ['discord-server-stats', inviteCode],
    queryFn: async () => {
      // Defer fetch so it doesn't compete with LCP-critical rendering
      await new Promise<void>((resolve) => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(resolve, { timeout: 3000 });
        } else {
          setTimeout(resolve, 1000);
        }
      });

      const res = await fetch(
        `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`
      );

      if (!res.ok) {
        if (res.status !== 404) {
          console.warn('Discord invite API error:', res.status);
        }
        return { approximate_member_count: null, approximate_presence_count: null, guild_name: null, guild_icon: null };
      }

      const invite = await res.json();

      return {
        approximate_member_count: invite.approximate_member_count ?? null,
        approximate_presence_count: invite.approximate_presence_count ?? null,
        guild_name: invite.guild?.name ?? null,
        guild_icon: invite.guild?.icon
          ? `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.png?size=64`
          : null,
      };
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 45,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  return {
    memberCount: data?.approximate_member_count ?? null,
    onlineCount: data?.approximate_presence_count ?? null,
    guildName: data?.guild_name ?? null,
    guildIcon: data?.guild_icon ?? null,
    isLoading,
  };
}
