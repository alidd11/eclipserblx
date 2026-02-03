import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AdTierType = 'basic' | 'pro' | 'premium';

interface TierGamepassConfig {
  gamepassId: string;
  robuxPrice: number;
  isEnabled: boolean;
}

interface RobuxAdSettings {
  tiers: Record<AdTierType, TierGamepassConfig>;
  isAnyTierEnabled: boolean;
}

const DEFAULT_TIER_CONFIG: TierGamepassConfig = {
  gamepassId: '',
  robuxPrice: 0,
  isEnabled: false,
};

export function useRobuxAdSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['robux-ad-tier-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'robux_ad_basic_gamepass_id',
          'robux_ad_basic_robux_price',
          'robux_ad_pro_gamepass_id',
          'robux_ad_pro_robux_price',
          'robux_ad_premium_gamepass_id',
          'robux_ad_premium_robux_price',
        ]);

      if (error) throw error;

      const result: RobuxAdSettings = {
        tiers: {
          basic: { ...DEFAULT_TIER_CONFIG },
          pro: { ...DEFAULT_TIER_CONFIG },
          premium: { ...DEFAULT_TIER_CONFIG },
        },
        isAnyTierEnabled: false,
      };

      data?.forEach((item) => {
        const value = typeof item.value === 'string' 
          ? item.value.replace(/^"|"$/g, '') 
          : String(item.value || '');
        
        if (item.key === 'robux_ad_basic_gamepass_id') {
          result.tiers.basic.gamepassId = value;
          result.tiers.basic.isEnabled = !!value && value.length > 0;
        } else if (item.key === 'robux_ad_basic_robux_price') {
          result.tiers.basic.robuxPrice = parseInt(value, 10) || 0;
        } else if (item.key === 'robux_ad_pro_gamepass_id') {
          result.tiers.pro.gamepassId = value;
          result.tiers.pro.isEnabled = !!value && value.length > 0;
        } else if (item.key === 'robux_ad_pro_robux_price') {
          result.tiers.pro.robuxPrice = parseInt(value, 10) || 0;
        } else if (item.key === 'robux_ad_premium_gamepass_id') {
          result.tiers.premium.gamepassId = value;
          result.tiers.premium.isEnabled = !!value && value.length > 0;
        } else if (item.key === 'robux_ad_premium_robux_price') {
          result.tiers.premium.robuxPrice = parseInt(value, 10) || 0;
        }
      });

      result.isAnyTierEnabled = Object.values(result.tiers).some(t => t.isEnabled);

      return result;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    settings: settings || {
      tiers: {
        basic: { ...DEFAULT_TIER_CONFIG },
        pro: { ...DEFAULT_TIER_CONFIG },
        premium: { ...DEFAULT_TIER_CONFIG },
      },
      isAnyTierEnabled: false,
    },
    isLoading,
    getTierConfig: (tier: AdTierType) => settings?.tiers[tier] || DEFAULT_TIER_CONFIG,
  };
}
