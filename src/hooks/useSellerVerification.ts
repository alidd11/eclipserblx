import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface VerificationResults {
  discord_server: {
    valid: boolean;
    is_permanent: boolean;
    guild_name?: string;
    member_count?: number;
    error?: string;
    verified_at?: string;
  } | null;
  roblox_group: {
    in_group: boolean;
    group_name?: string;
    role?: string;
    rank?: number;
    error?: string;
  } | null;
  roblox_badges: {
    required: string[];
    owned: string[];
    missing: string[];
    all_owned: boolean;
  } | null;
  account_age: {
    days: number;
    meets_requirement: boolean;
    required_days: number;
  } | null;
  email_verified: boolean;
  purchase_history: {
    count: number;
    total_spent: number;
    meets_requirement: boolean;
    required_count: number;
  } | null;
  identity_consistency: {
    discord_username: string;
    roblox_username: string;
    similarity_score: number;
    is_consistent: boolean;
  } | null;
}

interface SellerVerificationSettings {
  seller_min_account_age_days: number;
  seller_min_purchases_required: number;
  seller_require_group_membership: boolean;
  seller_require_badge_ownership: boolean;
  roblox_group_id: string;
  roblox_required_badges: string[];
}

const DEFAULT_SETTINGS: SellerVerificationSettings = {
  seller_min_account_age_days: 0,
  seller_min_purchases_required: 0,
  seller_require_group_membership: true,
  seller_require_badge_ownership: false,
  roblox_group_id: '',
  roblox_required_badges: [],
};

// Simple string similarity function (Levenshtein-based normalized)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (s1 === s2) return 100;
  if (!s1.length || !s2.length) return 0;
  
  // Check for substring match
  if (s1.includes(s2) || s2.includes(s1)) {
    return 80;
  }
  
  // Simple character overlap check
  const chars1 = new Set(s1.split(''));
  const chars2 = new Set(s2.split(''));
  const intersection = [...chars1].filter(c => chars2.has(c)).length;
  const union = new Set([...chars1, ...chars2]).size;
  
  return Math.round((intersection / union) * 100);
}

export function useSellerVerification() {
  const { user, session } = useAuth();
  const [discordValidating, setDiscordValidating] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResults>({
    discord_server: null,
    roblox_group: null,
    roblox_badges: null,
    account_age: null,
    email_verified: false,
    purchase_history: null,
    identity_consistency: null,
  });

  // Fetch verification settings
  const { data: settings = DEFAULT_SETTINGS } = useQuery({
    queryKey: ['seller-verification-settings'],
    queryFn: async () => {
      const keys = [
        'seller_min_account_age_days',
        'seller_min_purchases_required',
        'seller_require_group_membership',
        'seller_require_badge_ownership',
        'roblox_group_id',
        'roblox_required_badges',
      ];
      
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', keys);
      
      if (error) throw error;
      
      const result = { ...DEFAULT_SETTINGS };
      data?.forEach((item) => {
        const key = item.key as keyof SellerVerificationSettings;
        if (key in result) {
          if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
            (result as any)[key] = item.value === true || item.value === 'true';
          } else if (typeof DEFAULT_SETTINGS[key] === 'number') {
            (result as any)[key] = parseInt(String(item.value || '0'), 10) || DEFAULT_SETTINGS[key];
          } else if (Array.isArray(DEFAULT_SETTINGS[key])) {
            (result as any)[key] = Array.isArray(item.value) ? item.value : [];
          } else {
            (result as any)[key] = String(item.value || '');
          }
        }
      });
      
      return result;
    },
  });

  // Fetch user profile data
  const { data: userProfile } = useQuery({
    queryKey: ['seller-verification-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('discord_id, discord_username, roblox_user_id, roblox_username, created_at')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch purchase history
  const { data: purchaseData } = useQuery({
    queryKey: ['seller-verification-purchases', user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0, total: 0 };
      
      const { data, error } = await supabase
        .from('orders')
        .select('total')
        .eq('user_id', user.id)
        .in('status', ['paid', 'completed']);
      
      if (error) throw error;
      
      const count = data?.length || 0;
      const total = data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      
      return { count, total };
    },
    enabled: !!user?.id,
  });

  // Run automated verifications when data is available
  useEffect(() => {
    if (!userProfile || !user) return;

    const runVerifications = async () => {
      const results: VerificationResults = { ...verificationResults };

      // 1. Account Age Check
      const accountCreatedAt = new Date(userProfile.created_at);
      const daysSinceCreation = Math.floor(
        (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      results.account_age = {
        days: daysSinceCreation,
        meets_requirement: daysSinceCreation >= settings.seller_min_account_age_days,
        required_days: settings.seller_min_account_age_days,
      };

      // 2. Email Verification
      results.email_verified = !!session?.user?.email_confirmed_at;

      // 3. Purchase History
      if (purchaseData) {
        results.purchase_history = {
          count: purchaseData.count,
          total_spent: purchaseData.total,
          meets_requirement: purchaseData.count >= settings.seller_min_purchases_required,
          required_count: settings.seller_min_purchases_required,
        };
      }

      // 4. Identity Consistency (Discord vs Roblox usernames)
      if (userProfile.discord_username && userProfile.roblox_username) {
        const similarity = stringSimilarity(
          userProfile.discord_username,
          userProfile.roblox_username
        );
        results.identity_consistency = {
          discord_username: userProfile.discord_username,
          roblox_username: userProfile.roblox_username,
          similarity_score: similarity,
          is_consistent: similarity >= 30, // 30% similarity threshold
        };
      }

      // 5. Roblox Group Membership
      if (userProfile.roblox_user_id && settings.roblox_group_id) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-roblox-group', {
            body: {
              roblox_user_id: userProfile.roblox_user_id,
              group_id: settings.roblox_group_id,
            },
          });

          if (error) throw error;

          results.roblox_group = {
            in_group: data?.in_group || false,
            group_name: data?.group_name,
            role: data?.role,
            rank: data?.rank,
          };
        } catch (err: any) {
          results.roblox_group = {
            in_group: false,
            error: err.message || 'Failed to verify group membership',
          };
        }
      }

      // 6. Roblox Badge Ownership
      if (
        userProfile.roblox_user_id &&
        settings.roblox_required_badges &&
        settings.roblox_required_badges.length > 0
      ) {
        const ownedBadges: string[] = [];
        const missingBadges: string[] = [];

        for (const badgeId of settings.roblox_required_badges) {
          try {
            const { data } = await supabase.functions.invoke('verify-roblox-badge', {
              body: {
                roblox_user_id: userProfile.roblox_user_id,
                badge_id: badgeId,
              },
            });

            if (data?.has_badge) {
              ownedBadges.push(badgeId);
            } else {
              missingBadges.push(badgeId);
            }
          } catch {
            missingBadges.push(badgeId);
          }
        }

        results.roblox_badges = {
          required: settings.roblox_required_badges,
          owned: ownedBadges,
          missing: missingBadges,
          all_owned: missingBadges.length === 0,
        };
      }

      setVerificationResults(results);
    };

    runVerifications();
  }, [userProfile, user, session, settings, purchaseData]);

  // Validate Discord invite URL
  const validateDiscordInvite = useCallback(async (inviteUrl: string) => {
    if (!inviteUrl.trim()) {
      setVerificationResults((prev) => ({
        ...prev,
        discord_server: null,
      }));
      return;
    }

    setDiscordValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-discord-invite', {
        body: { invite_url: inviteUrl },
      });

      if (error) throw error;

      setVerificationResults((prev) => ({
        ...prev,
        discord_server: {
          valid: data?.valid || false,
          is_permanent: data?.is_permanent || false,
          guild_name: data?.guild_name,
          member_count: data?.member_count,
          error: data?.error,
          verified_at: new Date().toISOString(),
        },
      }));
    } catch (err: any) {
      setVerificationResults((prev) => ({
        ...prev,
        discord_server: {
          valid: false,
          is_permanent: false,
          error: err.message || 'Failed to validate invite',
        },
      }));
    } finally {
      setDiscordValidating(false);
    }
  }, []);

  // Calculate if all required verifications pass
  const allRequirementsMet = useCallback((): boolean => {
    const { account_age, email_verified, purchase_history, roblox_group, roblox_badges, discord_server } =
      verificationResults;

    // Account age must pass
    if (!account_age?.meets_requirement) return false;

    // Email must be verified
    if (!email_verified) return false;

    // Purchase requirement (if configured)
    if (settings.seller_min_purchases_required > 0 && !purchase_history?.meets_requirement) {
      return false;
    }

    // Group membership (if required)
    if (settings.seller_require_group_membership && !roblox_group?.in_group) {
      return false;
    }

    // Badge ownership (if required)
    if (settings.seller_require_badge_ownership && !roblox_badges?.all_owned) {
      return false;
    }

    // Discord server must be valid and permanent
    if (!discord_server?.valid || !discord_server?.is_permanent) {
      return false;
    }

    return true;
  }, [verificationResults, settings]);

  return {
    verificationResults,
    settings,
    discordValidating,
    validateDiscordInvite,
    allRequirementsMet,
    userProfile,
  };
}
