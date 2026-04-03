import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';

const CURRENT_TOS_VERSION = '1.0';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  required: boolean;
  estimatedMinutes?: number;
}

export interface OnboardingData {
  tosSigned: boolean;
  hasAppearance: boolean;
  categoriesEnabled: boolean;
  hasProducts: boolean;
  hasSocials: boolean;
  hasRobloxLink: boolean;
  hasPayoutMethod: boolean;
}

export function useSellerOnboarding() {
  const { store } = useSellerStatus();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-onboarding-data', store?.id],
    queryFn: async (): Promise<OnboardingData | null> => {
      if (!store?.id) return null;

      const [tosRes, catRes, prodRes] = await Promise.all([
        supabase
          .from('seller_agreements')
          .select('id')
          .eq('store_id', store.id)
          .eq('agreement_version', CURRENT_TOS_VERSION)
          .maybeSingle(),
        supabase
          .from('store_categories')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('is_enabled', true),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id),
      ]);

      return {
        tosSigned: !!tosRes.data,
        categoriesEnabled: (catRes.count || 0) > 0,
        hasProducts: (prodRes.count || 0) > 0,
        hasAppearance: !!(store.logo_url || store.banner_url),
        hasSocials: !!(store.discord_url || store.twitter_url || store.youtube_url || store.roblox_url),
        hasRobloxLink: !!store.roblox_url,
        hasPayoutMethod: !!(
          store.paymentDetails?.payout_method ||
          store.paymentDetails?.stripe_account_id ||
          store.paymentDetails?.payouts_enabled ||
          store.paymentDetails?.paypal_email ||
          store.paymentDetails?.bank_name
        ),
      };
    },
    enabled: !!store?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Consolidated 5 steps: TOS → Store Setup (appearance+categories) → Payout → First Product → Extras (optional)
  const steps: OnboardingStep[] = data
    ? [
        {
          id: 'tos',
          title: 'Terms of Service',
          description: 'Review and accept the seller agreement',
          completed: data.tosSigned,
          href: '/seller/documents/terms',
          required: true,
          estimatedMinutes: 2,
        },
        {
          id: 'store-setup',
          title: 'Store Setup',
          description: 'Brand your store with a logo, banner, and categories',
          completed: data.hasAppearance && data.categoriesEnabled,
          href: '/seller/settings/appearance',
          required: true,
          estimatedMinutes: 3,
        },
        {
          id: 'payments',
          title: 'Payout Method',
          description: 'Choose how you want to get paid',
          completed: data.hasPayoutMethod,
          href: '/seller/settings/payments',
          required: true,
          estimatedMinutes: 2,
        },
        {
          id: 'products',
          title: 'First Product',
          description: 'Create your first listing and start selling',
          completed: data.hasProducts,
          href: '/seller/products/new',
          required: true,
          estimatedMinutes: 3,
        },
        {
          id: 'extras',
          title: 'Extras',
          description: 'Link Roblox profile & social channels (optional)',
          completed: data.hasSocials || data.hasRobloxLink,
          href: '/seller/settings/profile',
          required: false,
          estimatedMinutes: 1,
        },
      ]
    : [];

  const completedCount = steps.filter((s) => s.completed).length;
  const requiredSteps = steps.filter((s) => s.required);
  const requiredComplete = requiredSteps.filter((s) => s.completed).length;
  const allRequiredComplete = requiredSteps.length > 0 && requiredComplete === requiredSteps.length;
  const allComplete = steps.length > 0 && completedCount === steps.length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const nextStep = steps.find((s) => !s.completed);

  const remainingMinutes = steps
    .filter((s) => !s.completed)
    .reduce((sum, s) => sum + (s.estimatedMinutes || 1), 0);

  // Store health score (0-100) for post-onboarding dashboard
  const healthScore = data
    ? Math.round(
        ([
          data.tosSigned,
          data.hasAppearance,
          data.categoriesEnabled,
          data.hasPayoutMethod,
          data.hasProducts,
          data.hasSocials,
          data.hasRobloxLink,
        ].filter(Boolean).length / 7) * 100
      )
    : 0;

  return {
    steps,
    data,
    isLoading,
    completedCount,
    totalSteps: steps.length,
    progress,
    allComplete,
    allRequiredComplete,
    nextStep,
    remainingMinutes,
    healthScore,
    isOnboardingNeeded: !isLoading && data !== null && !allRequiredComplete,
  };
}
