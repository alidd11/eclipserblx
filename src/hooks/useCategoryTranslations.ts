import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface CategoryTranslation {
  category_id: string;
  translated_name: string;
  translated_description: string | null;
}

export function useCategoryTranslations() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const isEnglish = lang === 'en';

  const { data: translations } = useQuery({
    queryKey: ['category-translations', lang],
    queryFn: async (): Promise<Map<string, CategoryTranslation>> => {
      if (isEnglish) return new Map();

      const { data, error } = await supabase
        .from('category_translations')
        .select('category_id, translated_name, translated_description')
        .eq('language_code', lang);

      if (error) {
        console.error('Error fetching category translations:', error);
        return new Map();
      }

      const map = new Map<string, CategoryTranslation>();
      data?.forEach(t => map.set(t.category_id, t));
      return map;
    },
    enabled: !isEnglish,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    getTranslatedName: (categoryId: string, originalName: string) =>
      translations?.get(categoryId)?.translated_name || originalName,
    getTranslatedDescription: (categoryId: string, originalDescription: string | null) =>
      translations?.get(categoryId)?.translated_description || originalDescription,
    hasTranslations: !!translations && translations.size > 0,
  };
}
