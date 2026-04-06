// Eclipse+ has been fully removed. Stub exports to prevent import errors.

export type SubscriptionTier = 'basic' | 'pro' | 'premium';
export type BillingPeriod = 'monthly' | 'annual';

export interface TierData {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string | null;
  discount_percentage: number;
  free_products_per_month: number;
  monthly_price_gbp: number;
  annual_price_gbp: number;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  features: string[];
  display_order: number;
  is_active: boolean;
}

export function useSubscriptionTiers() {
  return { data: [] as TierData[], isLoading: false, error: null };
}

export function calculateAnnualSavings(_monthly: number, _annual: number): number {
  return 0;
}

export function calculateAnnualSavingsPercent(_monthly: number, _annual: number): number {
  return 0;
}
