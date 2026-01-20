import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  categories: { name: string } | null;
}

interface RecommendationsResponse {
  recommendations: RecommendedProduct[];
  strategy: 'followed_stores' | 'similar_categories' | 'similar_products' | 'popular';
  count: number;
}

export const useAIRecommendations = (productId?: string, limit = 6) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', user?.id, productId, limit],
    queryFn: async (): Promise<RecommendationsResponse> => {
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { 
          userId: user?.id,
          productId,
          limit,
        },
      });

      if (error) throw error;
      return data as RecommendationsResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
