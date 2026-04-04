import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

interface Suggestion {
  term: string;
  search_count: number;
}

export const useSearchSuggestions = (query: string) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [correction, setCorrection] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      setCorrection(null);
      return;
    }

    const fetchSuggestions = async () => {
      // Use the RPC to get spell correction suggestion
      const { data } = await supabase.rpc('suggest_correction', {
        search_query: debouncedQuery,
      });
      
      setCorrection(data || null);
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  return { suggestions, correction };
};
