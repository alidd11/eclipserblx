import { supabase } from '@/integrations/supabase/client';

/**
 * Submit specific URLs to search engines via IndexNow + Google ping.
 * Call this after a product or store is created/approved.
 */
export async function submitUrlsToSearchEngines(urls: string[]) {
  // Submit via IndexNow and Google Indexing API in parallel
  const promises = [
    supabase.functions.invoke('submit-indexnow', { body: { urls } })
      .catch((e) => console.error('IndexNow submission failed:', e)),
    supabase.functions.invoke('google-indexing', { body: { urls } })
      .catch((e) => console.error('Google Indexing API submission failed:', e)),
  ];

  await Promise.allSettled(promises);
}

const SITE_URL = 'https://eclipserblx.com';

/** Submit a product URL using its numeric product_number (preferred). */
export function submitProductUrl(productNumber: string | number) {
  submitUrlsToSearchEngines([`${SITE_URL}/products/${productNumber}`]);
}

export function submitStoreUrl(slug: string) {
  submitUrlsToSearchEngines([`${SITE_URL}/store/${slug}`]);
}
