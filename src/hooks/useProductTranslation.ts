import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface ProductTranslation {
  translated_name: string;
  translated_description: string | null;
}

export function useProductTranslation(productId: string | undefined) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const isEnglish = lang === 'en';

  const { data: translation } = useQuery({
    queryKey: ['product-translation', productId, lang],
    queryFn: async (): Promise<ProductTranslation | null> => {
      if (!productId || isEnglish) return null;

      const { data, error } = await supabase
        .from('product_translations')
        .select('translated_name, translated_description')
        .eq('product_id', productId)
        .eq('language_code', lang)
        .maybeSingle();

      if (error) {
        console.error('Error fetching translation:', error);
        return null;
      }
      return data;
    },
    enabled: !!productId && !isEnglish,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    getTranslatedName: (originalName: string) =>
      translation?.translated_name || originalName,
    getTranslatedDescription: (originalDescription: string | null) =>
      translation?.translated_description || originalDescription,
    hasTranslation: !!translation,
  };
}
