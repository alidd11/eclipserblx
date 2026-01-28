import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Safe store columns that can be selected (excludes credentials and payment details)
const SAFE_STORE_COLUMNS = `
  id, owner_id, store_id, name, slug, description, logo_url, banner_url,
  commission_rate, is_verified, is_active, status, reviewed_by, reviewed_at, 
  rejection_reason, total_sales, total_revenue, product_count, average_rating, 
  created_at, updated_at, theme, accent_color, bio,
  discord_url, twitter_url, youtube_url, tiktok_url, website_url, roblox_url,
  custom_commission_rate, custom_rate_expires_at, custom_rate_set_by, custom_rate_set_at,
  hero_title, hero_subtitle, hero_cta_text, hero_cta_link, custom_css,
  font_heading, font_body, announcement_text, announcement_active,
  featured_product_ids, layout_style, show_reviews, show_social_proof,
  follower_count, about_content, is_trusted, payout_method
`;

export interface Store {
  id: string;
  owner_id: string;
  store_id?: string;
  name: string;
  slug: string;
  description: string;
  logo_url?: string;
  banner_url?: string;
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
  // Payout method (non-sensitive field)
  payout_method?: string;
  // Followers
  follower_count?: number;
  about_content?: string;
  is_trusted?: boolean;
  // Credentials (fetched separately from store_credentials table)
  credentials?: StoreCredentials;
  // Payment details (fetched separately from store_payment_details table)
  paymentDetails?: StorePaymentDetails;
}

export interface StoreCredentials {
  discord_webhook_url?: string;
  review_discord_webhook_url?: string;
  discord_bot_token?: string;
  discord_guild_id?: string;
  discord_role_id?: string;
}

export interface StorePaymentDetails {
  stripe_account_id?: string;
  paypal_email?: string;
  payout_method?: string;
  payouts_enabled?: boolean;
  bank_name?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_swift_bic?: string;
  bank_country?: string;
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
      
      // Fetch store data (without sensitive credential columns)
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select(SAFE_STORE_COLUMNS)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (storeError) throw storeError;
      if (!storeData) return null;

      // Fetch credentials from separate secure table
      const { data: credentialsData } = await supabase
        .from('store_credentials')
        .select('discord_webhook_url, review_discord_webhook_url, discord_bot_token, discord_guild_id, discord_role_id')
        .eq('store_id', storeData.id)
        .maybeSingle();

      // Fetch payment details from separate secure table
      const { data: paymentData } = await supabase
        .from('store_payment_details')
        .select('stripe_account_id, paypal_email, payout_method, payouts_enabled, bank_name, bank_account_holder, bank_account_number, bank_routing_number, bank_swift_bic, bank_country')
        .eq('store_id', storeData.id)
        .maybeSingle();

      return {
        ...storeData,
        credentials: credentialsData || undefined,
        paymentDetails: paymentData || undefined,
      } as Store;
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
