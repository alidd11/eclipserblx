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

export function useIPShieldSubscription() {
  const { user, session } = useAuth();
  const lastSyncRef = useRef<number>(0);

  // Background Stripe sync (fire-and-forget)
  const syncWithStripe = useCallback(async () => {
    if (!session?.access_token) return;
    const now = Date.now();
    if (now - lastSyncRef.current < STRIPE_SYNC_INTERVAL) return;
    lastSyncRef.current = now;

    try {
      await supabase.functions.invoke('check-ip-shield-subscription');
    } catch (err) {
      console.error('Background IP Shield sync failed:', err);
    }
  }, [session]);

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

      // Check for admin-assigned custom plan (direct DB query)
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

      // For Stripe-based subscriptions, we rely on the background sync
      // The edge function syncs data to the subscriptions table, but IP Shield
      // uses a different Stripe price lookup - we need the edge function result
      // So fall back to calling it (but with aggressive caching)
      const { data, error } = await supabase.functions.invoke('check-ip-shield-subscription');
      if (error) throw error;
      return data as IPShieldSubscriptionStatus;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes - aggressive caching
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
