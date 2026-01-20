import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  description: string;
  categories: { name: string } | null;
}

interface SmartSearchResponse {
  products: SearchResult[];
  parsedQuery: {
    keywords: string[];
    category?: string;
    maxPrice?: number;
    minPrice?: number;
    sortBy?: string;
  };
  originalQuery: string;
}

export const useSmartSearch = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [parsedQuery, setParsedQuery] = useState<SmartSearchResponse['parsedQuery'] | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (query: string): Promise<SmartSearchResponse> => {
      const { data, error } = await supabase.functions.invoke('smart-search', {
        body: { query, userId: user?.id },
      });

      if (error) throw error;
      return data as SmartSearchResponse;
    },
    onSuccess: (data) => {
      setResults(data.products);
      setParsedQuery(data.parsedQuery);
    },
    onError: (error) => {
      console.error('Smart search error:', error);
      setResults([]);
      setParsedQuery(null);
    },
  });

  return {
    search: searchMutation.mutate,
    searchAsync: searchMutation.mutateAsync,
    results,
    parsedQuery,
    isSearching: searchMutation.isPending,
    error: searchMutation.error,
    reset: () => {
      setResults([]);
      setParsedQuery(null);
    },
  };
};
