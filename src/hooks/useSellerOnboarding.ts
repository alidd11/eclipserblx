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
        hasStripeConnect: !!(store.paymentDetails?.stripe_account_id || store.paymentDetails?.payouts_enabled),
      };
    },
    enabled: !!store?.id,
    staleTime: 2 * 60 * 1000,
  });

  const steps: OnboardingStep[] = data
    ? [
        { id: 'tos', title: 'Terms of Service', description: 'Review and accept the seller agreement', completed: data.tosSigned, href: '/seller/documents/terms', required: true },
        { id: 'appearance', title: 'Store Appearance', description: 'Upload a logo and banner', completed: data.hasAppearance, href: '/seller/settings/appearance', required: true },
        { id: 'categories', title: 'Categories', description: 'Choose your product categories', completed: data.categoriesEnabled, href: '/seller/categories', required: true },
        { id: 'payments', title: 'Payment Setup', description: 'Connect Stripe to receive payouts', completed: data.hasStripeConnect, href: '/seller/settings/payments', required: true },
        { id: 'roblox', title: 'Roblox Link', description: 'Link your Roblox creator store', completed: data.hasRobloxLink, href: '/seller/roblox', required: false },
        { id: 'socials', title: 'Social Links', description: 'Connect your community channels', completed: data.hasSocials, href: '/seller/settings/profile', required: false },
        { id: 'products', title: 'First Product', description: 'Create your first listing', completed: data.hasProducts, href: '/seller/products/new', required: true },
      ]
    : [];

  const completedCount = steps.filter((s) => s.completed).length;
  const requiredSteps = steps.filter((s) => s.required);
  const requiredComplete = requiredSteps.filter((s) => s.completed).length;
  const allRequiredComplete = requiredSteps.length > 0 && requiredComplete === requiredSteps.length;
  const allComplete = steps.length > 0 && completedCount === steps.length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const nextStep = steps.find((s) => !s.completed);

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
    isOnboardingNeeded: !isLoading && data !== null && !allRequiredComplete,
  };
}
