import { supabase } from '@/integrations/supabase/client';

export interface ExternalProduct {
  name: string;
  description: string;
  price: number;
  images: string[];
  sourceUrl: string;
  platform: string;
  sellerName?: string;
}

export interface ImportListResponse {
  success: boolean;
  products?: ExternalProduct[];
  platform?: string;
  error?: string;
}

export interface ImportDetailsResponse {
  success: boolean;
  product?: ExternalProduct;
  error?: string;
}

export const productImportApi = {
  /**
   * List all products from an external store
   */
  async listProducts(storeUrl: string): Promise<ImportListResponse> {
    const { data, error } = await supabase.functions.invoke('import-external-products', {
      body: { action: 'list', storeUrl },
    });

    if (error) {
      console.error('Import list error:', error);
      return { success: false, error: error.message };
    }

    return data;
  },

  /**
   * Get full details for a single product
   */
  async getProductDetails(productUrl: string): Promise<ImportDetailsResponse> {
    const { data, error } = await supabase.functions.invoke('import-external-products', {
      body: { action: 'details', productUrl },
    });

    if (error) {
      console.error('Import details error:', error);
      return { success: false, error: error.message };
    }

    return data;
  },

  /**
   * Get supported platforms
   */
  getSupportedPlatforms() {
    return [
      { id: 'clearlydev', name: 'ClearlyDev', baseUrl: 'https://clearlydev.com/store/' },
      { id: 'builtbybit', name: 'BuiltByBit', baseUrl: 'https://builtbybit.com/members/' },
    ];
  },
};
