import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RobloxSettings {
  roblox_game_url: string;
  roblox_group_id: string;
  roblox_group_discount_enabled: boolean;
  roblox_group_discount_percent: number;
  roblox_group_min_rank: number;
  roblox_premium_discount_enabled: boolean;
  roblox_premium_discount_percent: number;
  roblox_badge_rewards_enabled: boolean;
  roblox_required_badges: string[];
  // Tier-specific advertisement gamepass settings
  robux_ad_basic_gamepass_id: string;
  robux_ad_basic_robux_price: number;
  robux_ad_pro_gamepass_id: string;
  robux_ad_pro_robux_price: number;
  robux_ad_premium_gamepass_id: string;
  robux_ad_premium_robux_price: number;
}

const DEFAULT_SETTINGS: RobloxSettings = {
  roblox_game_url: '',
  roblox_group_id: '',
  roblox_group_discount_enabled: false,
  roblox_group_discount_percent: 10,
  roblox_group_min_rank: 1,
  roblox_premium_discount_enabled: false,
  roblox_premium_discount_percent: 5,
  roblox_badge_rewards_enabled: false,
  roblox_required_badges: [],
  // Tier-specific advertisement gamepass defaults
  robux_ad_basic_gamepass_id: '',
  robux_ad_basic_robux_price: 0,
  robux_ad_pro_gamepass_id: '',
  robux_ad_pro_robux_price: 0,
  robux_ad_premium_gamepass_id: '',
  robux_ad_premium_robux_price: 0,
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof RobloxSettings)[];

export function useRobloxSettings() {
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ['roblox-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', SETTING_KEYS);

      if (error) throw error;

      const result = { ...DEFAULT_SETTINGS };
      data?.forEach((item) => {
        const key = item.key as keyof RobloxSettings;
        if (key in result) {
          if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
            (result as any)[key] = item.value === true || item.value === 'true';
          } else if (typeof DEFAULT_SETTINGS[key] === 'number') {
            (result as any)[key] = parseInt(String(item.value || '0'), 10) || DEFAULT_SETTINGS[key];
          } else if (Array.isArray(DEFAULT_SETTINGS[key])) {
            (result as any)[key] = Array.isArray(item.value) ? item.value : [];
          } else {
            // Handle string values - strip quotes if present
            const strVal = String(item.value || '');
            (result as any)[key] = strVal.replace(/^"|"$/g, '');
          }
        }
      });

      return result;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<RobloxSettings>) => {
      const updates = Object.entries(newSettings).map(async ([key, value]) => {
        const { error } = await supabase
          .from('settings')
          .upsert({ key, value: value as any }, { onConflict: 'key' });
        if (error) throw error;
      });
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roblox-settings'] });
      queryClient.invalidateQueries({ queryKey: ['robux-ad-tier-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
}
