import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Code, Bot, Layout, Box, Palette, Wrench, Gamepad2, ArrowRight, ChevronRight, Package, Map, Shirt, Plane } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { cn } from '@/lib/utils';

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

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  display_order: number | null;
}

export function LandingCategories() {
  const { t } = useTranslation();
  const { getTranslatedName, getTranslatedDescription } = useCategoryTranslations();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { data: allCategories } = useQuery({
    queryKey: ['landing-categories-with-children'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon, parent_id, display_order')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const parentCategories = allCategories?.filter(c => !c.parent_id) || [];
  const getChildren = (parentId: string) =>
    allCategories?.filter(c => c.parent_id === parentId).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) || [];

  if (!parentCategories.length) return null;

  return (
    <section className="py-16 sm:py-20">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            {t('landing.browseByCategory')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.browseByCategoryDesc')}
          </p>
        </motion.div>

        {/* Category List */}
        <div className="max-w-3xl mx-auto space-y-1">
          {parentCategories.map((category, index) => {
            const children = getChildren(category.id);
            const hasChildren = children.length > 0;
            const isExpanded = expandedCategory === category.id;
            const IconComponent = iconMap[category.icon || ''] || Package;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                {/* Parent Category Row */}
                {hasChildren ? (
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                      "hover:bg-muted/60",
                      isExpanded && "bg-muted/40"
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IconComponent className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">
                        {getTranslatedName(category.id, category.name)}
                      </span>
                      {category.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {getTranslatedDescription(category.id, category.description)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                      isExpanded && "rotate-90"
                    )} />
                  </button>
                ) : (
                  <Link
                    to={`/products?category=${category.slug}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-muted/60 group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IconComponent className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {getTranslatedName(category.id, category.name)}
                      </span>
                      {category.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {getTranslatedDescription(category.id, category.description)}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                )}

                {/* Sub-categories */}
                <AnimatePresence>
                  {hasChildren && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-8 pr-2 pb-1 space-y-0.5">
                        {/* View All for this category */}
                        <Link
                          to={`/products?category=${category.slug}`}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm hover:bg-muted/40 transition-colors group"
                        >
                          <div className="h-7 w-7 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-muted-foreground group-hover:text-primary transition-colors font-medium">
                            View All {getTranslatedName(category.id, category.name)}
                          </span>
                        </Link>

                        {children.map((child) => {
                          const ChildIcon = iconMap[child.icon || ''] || Package;
                          return (
                            <Link
                              key={child.id}
                              to={`/products?category=${child.slug}`}
                              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm hover:bg-muted/40 transition-colors group"
                            >
                              <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                                <ChildIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                                {getTranslatedName(child.id, child.name)}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* View All */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {t('landing.viewAllCategories')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
