import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveStore } from '@/contexts/ActiveStoreContext';

// Safe store columns that can be selected (excludes credentials and payment details)
const SAFE_STORE_COLUMNS = `
  id, owner_id, store_id, name, slug, description, logo_url, banner_url,
  commission_rate, is_verified, is_active, status, reviewed_by, reviewed_at, 
  rejection_reason, total_sales, total_revenue, product_count, average_rating, 
  created_at, updated_at, theme, accent_color, bio,
  discord_url, twitter_url, youtube_url, tiktok_url, website_url, roblox_url,
  custom_commission_rate, custom_rate_expires_at, custom_rate_set_by, custom_rate_set_at, free_commission_until,
  hero_title, hero_subtitle, hero_cta_text, hero_cta_link, custom_css,
  font_heading, font_body, announcement_text, announcement_active,
  featured_product_ids, layout_style, show_reviews, show_social_proof,
  follower_count, about_content, payout_method, pwyw_enabled,
  eclipse_plus_discount_enabled, is_testing,
  roblox_group_id, roblox_group_discount_enabled, roblox_group_discount_percent,
  roblox_group_min_rank, roblox_premium_discount_enabled, roblox_premium_discount_percent,
  roblox_gamepass_id, roblox_gamepass_discount_enabled, roblox_gamepass_discount_percent,
  banner_start_at, banner_end_at
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
  // Pay What You Want
  pwyw_enabled?: boolean;
  // Member discount
  eclipse_plus_discount_enabled?: boolean;
  // Testing mode
  is_testing?: boolean;
  // Followers
  follower_count?: number;
  about_content?: string;
  // Roblox integrations
  roblox_group_id?: string;
  roblox_group_discount_enabled?: boolean;
  roblox_group_discount_percent?: number;
  roblox_group_min_rank?: number;
  roblox_premium_discount_enabled?: boolean;
  roblox_premium_discount_percent?: number;
  roblox_gamepass_id?: string;
  roblox_gamepass_discount_enabled?: boolean;
  roblox_gamepass_discount_percent?: number;
  // Free commission promo
  free_commission_until?: string;
  // Scheduled banner
  banner_start_at?: string;
  banner_end_at?: string;
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
  product_drops_role_id?: string;
  early_product_drops_role_id?: string;
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
}

export interface SellerBalance {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid: number;
}

export function useSellerStatus() {
  const { user } = useAuth();

  // Read the active store ID reactively from context (synced with StoreSwitcher)
  const { activeStoreId } = useActiveStore();

  

  // Check if user has an approved store
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['seller-store', user?.id, activeStoreId],
    queryFn: async () => {
      if (!user?.id) return null;

      let storeData: any = null;

      // If an active store is selected, try to fetch it (owned OR team member)
      if (activeStoreId) {
        // First check if user owns this store
        const { data: ownedStore } = await supabase
          .from('stores')
          .select(SAFE_STORE_COLUMNS)
          .eq('id', activeStoreId)
          .eq('owner_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (ownedStore) {
          storeData = ownedStore;
        } else {
          // Check if user is a team member of this store
          const { data: teamMember } = await supabase
            .from('store_team_members')
            .select('store_id')
            .eq('store_id', activeStoreId)
            .eq('user_id', user.id)
            .not('accepted_at', 'is', null)
            .maybeSingle();

          if (teamMember) {
            const { data: teamStore } = await supabase
              .from('stores')
              .select(SAFE_STORE_COLUMNS)
              .eq('id', activeStoreId)
              .eq('status', 'approved')
              .maybeSingle();

            if (teamStore) {
              storeData = teamStore;
            }
          }
        }
      }

      // Fallback: get the first owned store
      if (!storeData) {
        const { data: fallback, error: storeError } = await supabase
          .from('stores')
          .select(SAFE_STORE_COLUMNS)
          .eq('owner_id', user.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (storeError) throw storeError;
        if (!fallback) return null;
        storeData = fallback;
      }

      // Fetch credentials and payment details in parallel
      const [{ data: credentialsData }, { data: paymentData }] = await Promise.all([
        (supabase
          .from('store_credentials_safe' as any)
          .select('discord_webhook_url, review_discord_webhook_url, discord_bot_token, discord_guild_id, discord_role_id, product_drops_role_id, early_product_drops_role_id') as any)
          .eq('store_id', storeData.id)
          .maybeSingle(),
        (supabase
          .from('store_payment_details_safe' as any)
          .select('stripe_account_id, paypal_email, payout_method, payouts_enabled, bank_name, bank_account_holder, bank_account_number, bank_routing_number, bank_swift_bic, bank_country') as any)
          .eq('store_id', storeData.id)
          .maybeSingle(),
      ]);

      const result = {
        ...storeData,
        credentials: credentialsData || undefined,
        paymentDetails: paymentData || undefined,
      } as Store;
      
      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Check if user has a pending application
  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ['seller-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('store_applications')
        .select('id, user_id, store_name, status, created_at, reviewed_at, reviewed_by, rejection_reason')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as StoreApplication | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - application status changes infrequently
  });

  // Get seller balance for the active store
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['seller-balance', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      
      const { data, error } = await supabase
        .from('seller_balances')
        .select('available_balance, pending_balance, total_earned, total_paid')
        .eq('store_id', store.id)
        .maybeSingle();

      if (error) throw error;
      return data as SellerBalance | null;
    },
    enabled: !!store?.id && store?.status === 'approved',
    staleTime: 2 * 60 * 1000,
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
