import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Store {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  bio: string | null;
  theme: string | null;
  accent_color: string | null;
  stripe_account_id: string | null;
  payouts_enabled: boolean;
  commission_rate: number;
  is_verified: boolean;
  is_active: boolean;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  total_sales: number;
  total_revenue: number;
  product_count: number;
  average_rating: number | null;
  created_at: string;
  discord_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
  discord_webhook_url: string | null;
  review_discord_webhook_url: string | null;
  discord_bot_token: string | null;
  discord_guild_id: string | null;
  discord_role_id: string | null;
  // Advanced customization fields
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_cta_text: string | null;
  hero_cta_link: string | null;
  custom_css: string | null;
  font_heading: string | null;
  font_body: string | null;
  announcement_text: string | null;
  announcement_active: boolean;
  featured_product_ids: string[] | null;
  layout_style: string | null;
  show_reviews: boolean;
  show_social_proof: boolean;
  // Payout method fields
  paypal_email: string | null;
  payout_method: 'stripe' | 'paypal' | 'bank';
}

export interface StoreApplication {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  product_category: string | null;
  expected_products: string | null;
  portfolio_url: string | null;
  experience: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  age_confirmed: boolean;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
}

export interface SellerBalance {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid: number;
}

export function useSellerStatus() {
  const { user } = useAuth();

  // Check if user has an approved store
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['seller-store', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Store | null;
    },
    enabled: !!user?.id,
  });

  // Check if user has a pending application
  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ['seller-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('store_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as StoreApplication | null;
    },
    enabled: !!user?.id,
  });

  // Get seller balance if they have an approved store
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['seller-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('seller_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as SellerBalance | null;
    },
    enabled: !!user?.id && store?.status === 'approved',
  });

  const isSeller = store?.status === 'approved';
  const hasStore = !!store;
  const hasPendingApplication = application?.status === 'pending';
  const applicationRejected = application?.status === 'rejected';

  return {
    store,
    application,
    balance,
    isSeller,
    hasStore,
    hasPendingApplication,
    applicationRejected,
    loading: storeLoading || applicationLoading,
    balanceLoading,
  };
}
