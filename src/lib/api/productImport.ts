import { supabase } from '@/integrations/supabase/client';

export interface ExternalProduct {
  name: string;
  description: string;
  price: number;
  images: string[];
  sourceUrl: string;
  platform: string;
  sellerName?: string;
  suggestedCategoryId?: string;
  alreadyImported?: boolean;
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

export interface BulkImportResult {
  url: string;
  success: boolean;
  product?: ExternalProduct;
  error?: string;
}

export interface BulkImportResponse {
  success: boolean;
  results?: BulkImportResult[];
  imported?: number;
  failed?: number;
  error?: string;
}

export interface ImportHistoryItem {
  id: string;
  store_id: string;
  product_id: string | null;
  source_url: string;
  source_platform: string;
  source_name: string;
  source_price: number | null;
  imported_at: string;
  imported_by: string;
  status: 'completed' | 'failed' | 'skipped';
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface ImportHistoryResponse {
  success: boolean;
  imports?: ImportHistoryItem[];
  error?: string;
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const err = error as any;

  // Supabase Functions errors often include the raw Response in `context`.
  const res: Response | undefined = err?.context;
  if (res && typeof res.clone === 'function') {
    try {
      const json = await res.clone().json();
      const msg = (json as any)?.error ?? (json as any)?.message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    } catch {
      // ignore
    }

    try {
      const text = await res.clone().text();
      if (typeof text === 'string' && text.trim()) return text;
    } catch {
      // ignore
    }

    if (typeof res.status === 'number' && res.status > 0) {
      return `Request failed (HTTP ${res.status})`;
    }
  }

  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return 'Request failed';
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
      return { success: false, error: await getFunctionErrorMessage(error) };
    }

    return data;
  },

  /**
   * Get full details for a single product
   */
  async getProductDetails(productUrl: string, downloadImages = false): Promise<ImportDetailsResponse> {
    const { data, error } = await supabase.functions.invoke('import-external-products', {
      body: { action: 'details', productUrl, downloadImages },
    });

    if (error) {
      console.error('Import details error:', error);
      return { success: false, error: await getFunctionErrorMessage(error) };
    }

    return data;
  },

  /**
   * Bulk import multiple products at once
   */
  async bulkImport(productUrls: string[], downloadImages = false): Promise<BulkImportResponse> {
    const { data, error } = await supabase.functions.invoke('import-external-products', {
      body: { action: 'bulk-details', productUrls, downloadImages },
    });

    if (error) {
      console.error('Bulk import error:', error);
      return { success: false, error: await getFunctionErrorMessage(error) };
    }

    return data;
  },

  /**
   * Get import history for the current store
   */
  async getHistory(): Promise<ImportHistoryResponse> {
    const { data, error } = await supabase.functions.invoke('import-external-products', {
      body: { action: 'history' },
    });

    if (error) {
      console.error('Import history error:', error);
      return { success: false, error: await getFunctionErrorMessage(error) };
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
