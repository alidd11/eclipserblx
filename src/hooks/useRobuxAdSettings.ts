import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RobuxAdSettings {
  gamepassId: string;
  gamepassName: string;
  robuxPrice: number;
  isEnabled: boolean;
}

export function useRobuxAdSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['robux-ad-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'robux_ad_gamepass_id',
          'robux_ad_gamepass_name',
          'robux_ad_gamepass_robux_price',
        ]);

      if (error) throw error;

      const result: RobuxAdSettings = {
        gamepassId: '',
        gamepassName: 'Single Advertisement',
        robuxPrice: 100,
        isEnabled: false,
      };

      data?.forEach((item) => {
        const value = typeof item.value === 'string' 
          ? item.value.replace(/^"|"$/g, '') 
          : String(item.value || '');
        
        switch (item.key) {
          case 'robux_ad_gamepass_id':
            result.gamepassId = value;
            result.isEnabled = !!value && value.length > 0;
            break;
          case 'robux_ad_gamepass_name':
            result.gamepassName = value || 'Single Advertisement';
            break;
          case 'robux_ad_gamepass_robux_price':
            result.robuxPrice = parseInt(value, 10) || 100;
            break;
        }
      });

      return result;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    settings: settings || {
      gamepassId: '',
      gamepassName: 'Single Advertisement',
      robuxPrice: 100,
      isEnabled: false,
    },
    isLoading,
  };
}
