import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Store {
  id: string;
  owner_id: string;
  store_id?: string;
  name: string;
  slug: string;
  description: string;
  logo_url?: string;
  banner_url?: string;
  stripe_account_id?: string;
  payouts_enabled?: boolean;
  commission_rate: number;
  is_verified?: boolean;
  is_active?: boolean;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  total_sales: number;
  total_revenue: number;
  product_count: number;
  average_rating?: number;
  created_at: string;
  updated_at: string;
  // Customization fields
  theme?: string;
  accent_color?: string;
  bio?: string;
  discord_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  website_url?: string;
  roblox_url?: string;
  // Custom commission rate
  custom_commission_rate?: number;
  custom_rate_expires_at?: string;
  custom_rate_set_by?: string;
  custom_rate_set_at?: string;
  // Discord integration
  discord_webhook_url?: string;
  review_discord_webhook_url?: string;
  discord_bot_token?: string;
  discord_guild_id?: string;
  discord_role_id?: string;
  // Storefront customization
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_text?: string;
  hero_cta_link?: string;
  custom_css?: string;
  font_heading?: string;
  font_body?: string;
  announcement_text?: string;
  announcement_active?: boolean;
  featured_product_ids?: string[];
  layout_style?: string;
  show_reviews?: boolean;
  show_social_proof?: boolean;
  // Payout settings
  paypal_email?: string;
  payout_method?: string;
  // Bank transfer fields
  bank_name?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_swift_bic?: string;
  bank_country?: string;
  // Followers
  follower_count?: number;
  about_content?: string;
  is_trusted?: boolean;
}

export interface StoreApplication {
  id: string;
  user_id: string;
  store_name: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  accepted_terms?: boolean;
  accepted_commission?: boolean;
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
