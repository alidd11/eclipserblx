import type { Json } from '@/integrations/supabase/types';

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
  eclipse_free_eligible: boolean;
  images: string[];
  asset_file_url: string;
  schedule_enabled: boolean;
  release_at: string;
  early_access_enabled: boolean;
  early_access_hours: string;
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
  eclipse_free_eligible: false,
  images: [],
  asset_file_url: '',
  schedule_enabled: false,
  release_at: '',
  early_access_enabled: false,
  early_access_hours: '',
  ip_ownership_confirmed: false,
  is_pay_what_you_want: false,
  min_price: '0',
  max_downloads_per_purchase: '',
};

export const MAX_IMAGES = 4;
