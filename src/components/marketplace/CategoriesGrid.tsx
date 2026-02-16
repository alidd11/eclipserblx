import { Link } from 'react-router-dom';
import { Car, Code, Bot, Layout, Box, Palette, Wrench, Gamepad2, Package, Map, Shirt, Plane, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { Skeleton } from '@/components/ui/skeleton';

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

export function CategoriesGrid() {
  const { getTranslatedName, getTranslatedDescription } = useCategoryTranslations();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['marketplace-categories-grid'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon, parent_id, display_order')
        .is('parent_id', null)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No categories available yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Browse by Category</h2>
        <Link to="/categories" className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-0.5">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {categories.map((category, index) => {
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
                  <IconComponent className="h-4 w-4 text-primary" />
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
  );
}
