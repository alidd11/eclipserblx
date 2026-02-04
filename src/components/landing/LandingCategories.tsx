import { Link } from 'react-router-dom';
import { Car, Code, Bot, Layout, Box, Palette, Wrench, Gamepad2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

const categoryConfig: Record<string, { icon: typeof Car }> = {
  'vehicle-liveries': { icon: Car },
  'scripts-systems': { icon: Code },
  'discord-bots': { icon: Bot },
  'ui-kits': { icon: Layout },
  '3d-models': { icon: Box },
  'graphics': { icon: Palette },
  'tools': { icon: Wrench },
  'games': { icon: Gamepad2 },
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

// Categories that should use the region selection flow
const REGIONAL_CATEGORY_SLUGS = [
  'civilian-vehicles',
  'marked-police-vehicles',
  'unmarked-police-vehicles',
  'fire-vehicles',
  'ambulance-vehicles',
  'military-vehicles',
  'aircraft',
  'uniforms',
];

export function LandingCategories() {
  const { data: categories } = useQuery({
    queryKey: ['landing-categories'],
    queryFn: async () => {
      const { data: categoryData, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon')
        .is('parent_id', null)
        .order('display_order', { ascending: true })
        .limit(8);
      
      if (error) throw error;
      
      // Check if each category has sub-categories
      const categoriesWithSubCheck = await Promise.all(
        (categoryData || []).map(async (category) => {
          const { data: subCategories } = await supabase
            .from('categories')
            .select('id')
            .eq('parent_id', category.id);
          
          return {
            ...category,
            has_sub_categories: (subCategories?.length || 0) > 0,
          };
        })
      );
      
      return categoriesWithSubCheck as (Category & { has_sub_categories: boolean })[];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!categories?.length) return null;

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
            Browse by Category
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find exactly what you need from our curated collection of premium assets
          </p>
        </motion.div>

        {/* Category Grid - using consistent card styling */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category, index) => {
            const config = categoryConfig[category.slug] || { icon: Box };
            const IconComponent = config.icon;
            
            // Determine the correct link based on whether it's a regional category with sub-categories
            const useRegionSelect = REGIONAL_CATEGORY_SLUGS.includes(category.slug) && category.has_sub_categories;
            const linkTo = useRegionSelect
              ? `/browse/${category.slug}/region`
              : `/products?category=${category.slug}`;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link to={linkTo} className="group block h-full">
                  <Card className="h-full border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                        <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
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
            View all categories
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
