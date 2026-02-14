import { Link } from 'react-router-dom';
import { Car, Code, Bot, Layout, Box, Palette, Wrench, Gamepad2, ArrowRight, Package, Map, Shirt, Plane } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';

const iconMap: Record<string, typeof Car> = {
  'Car': Car,
  'FileCode': Code,
  'Bot': Bot,
  'Layout': Layout,
  'Box': Box,
  'Palette': Palette,
  'Wrench': Wrench,
  'Gamepad2': Gamepad2,
  'Package': Package,
  'Map': Map,
  'Shirt': Shirt,
  'Plane': Plane,
  'Sparkles': Palette,
};

const MAX_CATEGORIES = 6;

export function LandingCategories() {
  const { t } = useTranslation();
  const { getTranslatedName, getTranslatedDescription } = useCategoryTranslations();

  const { data: parentCategories } = useQuery({
    queryKey: ['landing-top-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon, parent_id, display_order')
        .is('parent_id', null)
        .order('display_order', { ascending: true })
        .limit(MAX_CATEGORIES);

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!parentCategories?.length) return null;

  return (
    <section className="py-6 sm:py-8">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {t('landing.browseByCategory')}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('landing.browseByCategoryDesc')}
            </p>
          </div>
          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium transition-colors shrink-0"
          >
            {t('landing.viewAllCategories')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {parentCategories.map((category, index) => {
            const IconComponent = iconMap[category.icon || ''] || Package;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
              >
                <Link
                  to={`/products?category=${category.slug}`}
                  className="group flex items-center gap-3 px-3.5 py-3 rounded-lg bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-primary/20 transition-all"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComponent className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors block truncate">
                      {getTranslatedName(category.id, category.name)}
                    </span>
                    {category.description && (
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {getTranslatedDescription(category.id, category.description)}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
