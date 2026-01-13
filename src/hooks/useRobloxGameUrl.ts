import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ROBLOX_GAME_URL } from '@/lib/constants';

export function useRobloxGameUrl() {
  const { data: robloxUrl, isLoading } = useQuery({
    queryKey: ['roblox-game-url'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'roblox_game_url')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        const val = typeof data.value === 'string' 
          ? data.value.replace(/^"|"$/g, '') 
          : String(data.value);
        return val || ROBLOX_GAME_URL;
      }
      
      return ROBLOX_GAME_URL;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    robloxUrl: robloxUrl || ROBLOX_GAME_URL,
    isLoading,
  };
}
