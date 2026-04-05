import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Skeleton } from '@/components/ui/skeleton';

export function CategorySpotlight() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['category-spotlight-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, icon, description')
        .is('parent_id', null)
        .order('display_order', { ascending: true })
        .limit(8);
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!categories?.length) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase">
            Browse by Category
          </h2>
          <Link to="/products" className="text-xs text-primary hover:underline flex items-center gap-1">
            All categories <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          {categories.slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all"
            >
              {cat.icon && (
                <span className="text-lg">{cat.icon}</span>
              )}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold truncate">{cat.name}</p>
                {cat.description && (
                  <p className="text-[10px] text-muted-foreground truncate">{cat.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
