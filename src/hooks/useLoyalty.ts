import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface LoyaltyState {
  points: number;
  lifetimePoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  isLoading: boolean;
  nextTier: { name: string; pointsNeeded: number } | null;
  progress: number; // 0-100 percentage to next tier
}

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  diamond: 10000,
};

const TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond'] as const;

export function useLoyalty() {
  const { user } = useAuth();
  const [state, setState] = useState<LoyaltyState>({
    points: 0,
    lifetimePoints: 0,
    tier: 'bronze',
    isLoading: true,
    nextTier: null,
    progress: 0,
  });

  const fetchLoyalty = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const { data } = await supabase
      .from('loyalty_points')
      .select('points, lifetime_points, tier')
      .eq('user_id', user.id)
      .maybeSingle();

    const points = data?.points ?? 0;
    const lifetimePoints = data?.lifetime_points ?? 0;
    const tier = (data?.tier ?? 'bronze') as LoyaltyState['tier'];

    const currentTierIdx = TIER_ORDER.indexOf(tier);
    const nextTierIdx = currentTierIdx + 1;
    
    let nextTier: LoyaltyState['nextTier'] = null;
    let progress = 100;

    if (nextTierIdx < TIER_ORDER.length) {
      const nextTierName = TIER_ORDER[nextTierIdx];
      const currentThreshold = TIER_THRESHOLDS[tier];
      const nextThreshold = TIER_THRESHOLDS[nextTierName];
      const pointsNeeded = nextThreshold - lifetimePoints;
      const range = nextThreshold - currentThreshold;
      progress = Math.min(100, ((lifetimePoints - currentThreshold) / range) * 100);
      nextTier = { name: nextTierName, pointsNeeded: Math.max(0, pointsNeeded) };
    }

    setState({
      points,
      lifetimePoints,
      tier,
      isLoading: false,
      nextTier,
      progress,
    });
  }, [user]);

  useEffect(() => {
    fetchLoyalty();
  }, [fetchLoyalty]);

  return { ...state, refetch: fetchLoyalty };
}
