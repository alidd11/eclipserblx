import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DISCORD_URL as DEFAULT_DISCORD_URL } from '@/lib/constants';

export function useDiscordUrl() {
  const { data: discordUrl, isLoading } = useQuery({
    queryKey: ['discord-invite-url'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'discord_invite_url')
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch Discord URL:', error);
        return DEFAULT_DISCORD_URL;
      }

      if (data?.value) {
        // Handle both string and JSON-encoded values
        const val = typeof data.value === 'string' 
          ? data.value.replace(/^"|"$/g, '') 
          : String(data.value);
        return val || DEFAULT_DISCORD_URL;
      }

      return DEFAULT_DISCORD_URL;
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes for faster updates
  });

  return {
    discordUrl: discordUrl || DEFAULT_DISCORD_URL,
    isLoading,
  };
}
