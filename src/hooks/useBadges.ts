import { useState, useEffect, useCallback } from 'react';
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

export function useBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  // Load all available badges
  const loadBadges = useCallback(async () => {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('display_order', { ascending: true });

    if (data) {
      setBadges(data as Badge[]);
    }
  }, []);

  // Load user's earned badges
  const loadUserBadges = useCallback(async () => {
    if (!user) {
      setUserBadges([]);
      return;
    }

    const { data } = await supabase
      .from('user_badges')
      .select(`
        id,
        badge_id,
        earned_at,
        badge:badges(*)
      `)
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (data) {
      setUserBadges(data.map(ub => ({
        id: ub.id,
        badge_id: ub.badge_id,
        earned_at: ub.earned_at,
        badge: ub.badge as unknown as Badge,
      })));
    }
  }, [user]);

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
          .select('*')
          .in('id', newBadgeIds);

        if (badgeDetails) {
          setNewBadges(badgeDetails as Badge[]);
        }

        // Reload user badges
        await loadUserBadges();
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  }, [user, loadUserBadges]);

  // Clear new badges notification
  const clearNewBadges = useCallback(() => {
    setNewBadges([]);
  }, []);

  // Load badges for a specific user (for public profiles)
  const loadUserBadgesById = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_badges')
      .select(`
        id,
        badge_id,
        earned_at,
        badge:badges(*)
      `)
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

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  useEffect(() => {
    if (user) {
      loadUserBadges();
    } else {
      setUserBadges([]);
    }
    setLoading(false);
  }, [user, loadUserBadges]);

  return {
    badges,
    userBadges,
    loading,
    newBadges,
    checkBadges,
    clearNewBadges,
    loadUserBadgesById,
    earnedBadgeIds: userBadges.map(ub => ub.badge_id),
  };
}
