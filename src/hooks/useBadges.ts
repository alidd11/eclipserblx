import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'purchase' | 'community' | 'engagement';
  requirement_type: string;
  requirement_value: number;
  display_order: number;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

const BADGE_COLUMNS = 'id, name, description, icon, color, category, requirement_type, requirement_value, display_order';

export function useBadges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  // Load all available badges (cached globally, rarely changes)
  const { data: badges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ['badges-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('badges')
        .select(BADGE_COLUMNS)
        .order('display_order', { ascending: true });
      return (data as Badge[]) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - badge definitions rarely change
  });

  // Load user's earned badges
  const { data: userBadges = [], isLoading: userBadgesLoading } = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_badges')
        .select(`id, badge_id, earned_at, badge:badges(${BADGE_COLUMNS})`)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (!data) return [];
      return data.map(ub => ({
        id: ub.id,
        badge_id: ub.badge_id,
        earned_at: ub.earned_at,
        badge: ub.badge as unknown as Badge,
      }));
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Check and award new badges
  const checkBadges = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_and_award_badges', {
        _user_id: user.id,
      });

      if (error) {
        console.error('Error checking badges:', error);
        return;
      }

      // If new badges were awarded, fetch their details
      if (data && data.length > 0) {
        const newBadgeIds = data.map((ub: { badge_id: string }) => ub.badge_id);
        const { data: badgeDetails } = await supabase
          .from('badges')
          .select(BADGE_COLUMNS)
          .in('id', newBadgeIds);

        if (badgeDetails) {
          setNewBadges(badgeDetails as Badge[]);
        }

        // Invalidate user badges cache to pick up new ones
        queryClient.invalidateQueries({ queryKey: ['user-badges', user.id] });
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  }, [user, queryClient]);

  // Clear new badges notification
  const clearNewBadges = useCallback(() => {
    setNewBadges([]);
  }, []);

  // Load badges for a specific user (for public profiles)
  const loadUserBadgesById = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_badges')
      .select(`id, badge_id, earned_at, badge:badges(${BADGE_COLUMNS})`)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (data) {
      return data.map(ub => ({
        id: ub.id,
        badge_id: ub.badge_id,
        earned_at: ub.earned_at,
        badge: ub.badge as unknown as Badge,
      }));
    }
    return [];
  }, []);

  return {
    badges,
    userBadges,
    loading: badgesLoading || userBadgesLoading,
    newBadges,
    checkBadges,
    clearNewBadges,
    loadUserBadgesById,
    earnedBadgeIds: userBadges.map(ub => ub.badge_id),
  };
}
