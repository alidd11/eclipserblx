import type { Json } from '@/integrations/supabase/types';
import type { EarlyAccessStrategy } from '@/components/seller/LaunchStrategyCard';

export interface ModerationFlags {
  nsfw_flags?: string[];
  lua_risk_level?: 'low' | 'medium' | 'high';
  lua_concerns?: string[];
  scan_timestamp?: string;
}

export interface ProductFormData {
  name: string;
  slug: string;
  price: string;
  seller_price: string;
  description: string;
  category_id: string;
  is_active: boolean;
  images: string[];
  asset_file_url: string;
  schedule_enabled: boolean;
  release_at: string;
  early_access_enabled: boolean;
  early_access_hours: string;
  early_access_strategy: EarlyAccessStrategy;
  early_access_min_orders: string;
  early_access_link_token: string;
  ip_ownership_confirmed: boolean;
  is_pay_what_you_want: boolean;
  min_price: string;
  max_downloads_per_purchase: string;
}

export const INITIAL_FORM_DATA: ProductFormData = {
  name: '',
  slug: '',
  price: '',
  seller_price: '',
  description: '',
  category_id: '',
  is_active: true,
  images: [],
  asset_file_url: '',
  schedule_enabled: false,
  release_at: '',
  early_access_enabled: false,
  early_access_hours: '',
  early_access_strategy: 'timed',
  early_access_min_orders: '2',
  early_access_link_token: '',
  ip_ownership_confirmed: false,
  is_pay_what_you_want: false,
  min_price: '0',
  max_downloads_per_purchase: '',
};

export const MAX_IMAGES = 4;
