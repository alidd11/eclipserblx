import { supabase } from '@/integrations/supabase/client';

/**
 * Apply Quantis watermark to a product image after upload.
 * Calls the watermark-product-image edge function which composites
 * the watermark at 45% width in the bottom-right corner.
 * 
 * Returns the (possibly cache-busted) public URL on success,
 * or the original URL if watermarking fails (non-blocking).
 */
export async function applyProductWatermark(
  publicUrl: string,
  storagePath: string
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('watermark-product-image', {
      body: { image_url: publicUrl, storage_path: storagePath },
    });

    if (error) {
      console.error('Watermark function error:', error);
      return publicUrl;
    }

    if (data?.skipped) return publicUrl;

    // Add cache buster so the browser fetches the watermarked version
    return data?.url ? `${data.url}?t=${Date.now()}` : publicUrl;
  } catch (err) {
    console.error('Watermark apply failed:', err);
    return publicUrl;
  }
}
