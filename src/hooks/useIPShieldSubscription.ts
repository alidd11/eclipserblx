import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRef, useEffect, useCallback } from 'react';

interface IPShieldSubscriptionStatus {
  subscribed: boolean;
  tier?: string;
  limits?: {
    takedowns_per_month: number;
    registry_limit: number;
    priority: boolean;
    monitoring: boolean;
    dedicated_agent: boolean;
  };
  subscription_end?: string;
  subscription_id?: string;
  custom_plan?: boolean;
  custom_label?: string;
}

const TIER_LIMITS: Record<string, IPShieldSubscriptionStatus['limits']> = {
  starter: { takedowns_per_month: 3, registry_limit: 15, priority: false, monitoring: false, dedicated_agent: false },
  pro: { takedowns_per_month: 15, registry_limit: -1, priority: true, monitoring: true, dedicated_agent: false },
  enterprise: { takedowns_per_month: -1, registry_limit: -1, priority: true, monitoring: true, dedicated_agent: true },
};

const ADMIN_TEST_EMAILS = ['alicanimir1@gmail.com'];

// Background Stripe sync interval: 30 minutes
const STRIPE_SYNC_INTERVAL = 30 * 60 * 1000;
// localStorage cache key
const CACHE_KEY = 'ip-shield-sub-cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useIPShieldSubscription() {
  const { user, session } = useAuth();
  const lastSyncRef = useRef<number>(0);

  // Background Stripe sync — writes result to localStorage cache
  const syncWithStripe = useCallback(async () => {
    if (!session?.access_token) return;
    const now = Date.now();
    if (now - lastSyncRef.current < STRIPE_SYNC_INTERVAL) return;
    lastSyncRef.current = now;

    try {
      const { data } = await supabase.functions.invoke('check-ip-shield-subscription');
      if (data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now(), userId: user?.id }));
      }
    } catch (err) {
      console.error('Background IP Shield sync failed:', err);
    }
  }, [session, user]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(syncWithStripe, 8000);
    const interval = setInterval(syncWithStripe, STRIPE_SYNC_INTERVAL);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [user, syncWithStripe]);

  return useQuery<IPShieldSubscriptionStatus>({
    queryKey: ['ip-shield-subscription', user?.id],
    queryFn: async (): Promise<IPShieldSubscriptionStatus> => {
      if (!user) return { subscribed: false };

      // Admin test override
      if (user.email && ADMIN_TEST_EMAILS.includes(user.email)) {
        return {
          subscribed: true,
          tier: 'enterprise',
          limits: TIER_LIMITS['enterprise'],
          subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_id: 'admin_test_override',
        };
      }

      // Check for admin-assigned custom plan (direct DB query — no edge function)
      const { data: customPlan } = await supabase
        .from('ip_shield_custom_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (customPlan) {
        const now = new Date();
        const notExpired = !customPlan.expires_at || new Date(customPlan.expires_at as string) > now;
        const started = new Date(customPlan.starts_at as string) <= now;
        if (notExpired && started) {
          return {
            subscribed: true,
            tier: (customPlan.tier as string) || 'custom',
            limits: {
              takedowns_per_month: customPlan.takedowns_per_month as number,
              registry_limit: customPlan.registry_limit as number,
              priority: customPlan.priority as boolean,
              monitoring: customPlan.monitoring as boolean,
              dedicated_agent: customPlan.dedicated_agent as boolean,
            },
            subscription_end: (customPlan.expires_at as string) || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            subscription_id: `custom_${customPlan.id}`,
            custom_plan: true,
            custom_label: customPlan.label as string,
          };
        }
      }

      // Read from localStorage cache (populated by background sync)
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts, userId } = JSON.parse(cached);
          if (userId === user.id && Date.now() - ts < CACHE_TTL && data) {
            return data as IPShieldSubscriptionStatus;
          }
        }
      } catch {}

      // First load with no cache — call edge function once, then cache
      const { data, error } = await supabase.functions.invoke('check-ip-shield-subscription');
      if (error) throw error;
      
      // Cache the result
      if (data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now(), userId: user.id }));
      }
      
      return data as IPShieldSubscriptionStatus;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
