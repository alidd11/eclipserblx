import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScoredProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  category_id: string | null;
  is_resellable: boolean;
  is_featured: boolean;
  created_at: string;
  download_count: number;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
    eclipse_plus_discount_enabled: boolean;
  } | null;
  categories?: {
    name: string;
    slug: string;
  } | null;
}

/**
 * Weighted scoring algorithm for fair product featuring.
 * 
 * Score = Recency (0-40) + Popularity (0-30) + Diversity (0-20) + Featured bonus (10)
 * Max 3 products per store to enforce diversity.
 */
function scoreProducts(products: ScoredProduct[], maxPerStore = 3): ScoredProduct[] {
  if (!products.length) return [];

  const now = Date.now();
  const DAY_MS = 86400000;
  const RECENCY_HALF_LIFE_DAYS = 7; // Score halves every 7 days

  // Find max download count for normalization
  const maxDownloads = Math.max(1, ...products.map(p => p.download_count || 0));

  // Count products per store for diversity scoring
  const storeProductCounts = new Map<string, number>();
  for (const p of products) {
    const slug = p.stores?.slug || 'unknown';
    storeProductCounts.set(slug, (storeProductCounts.get(slug) || 0) + 1);
  }
  const totalProducts = products.length;

  // Score each product
  const scored = products.map(p => {
    const storeSlug = p.stores?.slug || 'unknown';

    // 1. Recency score (0-40): exponential decay
    const ageMs = now - new Date(p.created_at).getTime();
    const ageDays = ageMs / DAY_MS;
    const recencyScore = 40 * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);

    // 2. Popularity score (0-30): normalized downloads
    const downloads = p.download_count || 0;
    const popularityScore = 30 * (downloads / maxDownloads);

    // 3. Store diversity bonus (0-20): stores with fewer products get boosted
    const storeCount = storeProductCounts.get(storeSlug) || 1;
    const storeShare = storeCount / totalProducts;
    // Inverse share: stores with fewer products get higher scores
    const diversityScore = 20 * (1 - storeShare);

    // 4. Featured bonus (10): manual flag still gives a small boost
    const featuredBonus = p.is_featured ? 10 : 0;

    const totalScore = recencyScore + popularityScore + diversityScore + featuredBonus;

    // Add small random jitter (0-3) for variety between page loads
    const jitter = Math.random() * 3;

    return { product: p, score: totalScore + jitter, storeSlug };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Enforce max per store cap
  const storeCounts = new Map<string, number>();
  const result: ScoredProduct[] = [];

  for (const { product, storeSlug } of scored) {
    const count = storeCounts.get(storeSlug) || 0;
    if (count >= maxPerStore) continue;
    storeCounts.set(storeSlug, count + 1);
    result.push(product);
  }

  return result;
}

interface UseFeaturedProductsOptions {
  limit?: number;
  maxPerStore?: number;
  queryKey?: string;
}

export function useFeaturedProducts({
  limit = 8,
  maxPerStore = 3,
  queryKey = 'featured-scored',
}: UseFeaturedProductsOptions = {}) {
  return useQuery({
    queryKey: [queryKey, limit, maxPerStore],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, images, category_id, is_resellable, is_featured, created_at, download_count,
          categories (name, slug),
          stores!inner (name, slug, logo_url, is_verified, is_trusted, is_active, is_testing, eclipse_plus_discount_enabled)
        `)
        .eq('is_active', true)
        .eq('stores.is_active', true)
        .eq('stores.is_testing', false)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(100); // Fetch a pool to score from

      if (error) throw error;
      const all = data as unknown as ScoredProduct[];
      const scored = scoreProducts(all, maxPerStore);
      return scored.slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
  });
}
