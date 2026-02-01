import { Link } from 'react-router-dom';
import { Car, Code, Bot, Layout, Box, Palette, Wrench, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const categoryConfig: Record<string, { icon: typeof Car; gradient: string; image?: string }> = {
  'vehicle-liveries': { 
    icon: Car, 
    gradient: 'from-blue-600 to-cyan-500',
  },
  'scripts-systems': { 
    icon: Code, 
    gradient: 'from-purple-600 to-pink-500',
  },
  'discord-bots': { 
    icon: Bot, 
    gradient: 'from-indigo-600 to-violet-500',
  },
  'ui-kits': { 
    icon: Layout, 
    gradient: 'from-green-600 to-emerald-500',
  },
  '3d-models': { 
    icon: Box, 
    gradient: 'from-orange-600 to-amber-500',
  },
  'graphics': { 
    icon: Palette, 
    gradient: 'from-pink-600 to-rose-500',
  },
  'tools': { 
    icon: Wrench, 
    gradient: 'from-slate-600 to-zinc-500',
  },
  'games': { 
    icon: Gamepad2, 
    gradient: 'from-red-600 to-orange-500',
  },
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export function LandingCategories() {
  const { data: categories } = useQuery({
    queryKey: ['landing-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon')
        .is('parent_id', null)
        .order('display_order', { ascending: true })
        .limit(8);
      
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!categories?.length) return null;

  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
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

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category, index) => {
            const config = categoryConfig[category.slug] || { 
              icon: Box, 
              gradient: 'from-primary to-primary/70' 
            };
            const IconComponent = config.icon;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link
                  to={`/categories/${category.slug}`}
                  className="group block"
                >
                  <div className={`
                    relative h-32 sm:h-40 rounded-xl overflow-hidden
                    bg-gradient-to-br ${config.gradient}
                    transition-all duration-300
                    hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20
                  `}>
                    {/* Overlay for text readability */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    
                    {/* Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <IconComponent className="h-12 w-12 sm:h-16 sm:w-16 text-white/80 group-hover:scale-110 transition-transform" />
                    </div>
                    
                    {/* Category Name */}
                    <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/60 to-transparent">
                      <h3 className="font-semibold text-white text-sm sm:text-base">
                        {category.name}
                      </h3>
                    </div>
                  </div>
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
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            View all categories →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
