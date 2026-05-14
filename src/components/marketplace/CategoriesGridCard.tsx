import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Grid3X3, ChevronRight } from 'lucide-react';
import { categoryIconMap, PackageIcon } from '@/components/icons/CategoryIcons';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  product_count: number;
}

export function CategoriesGridCard() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');
      
      if (error) throw error;
      
      const now = new Date().toISOString();
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_active', true)
            .not('store_id', 'is', null)
            .or(`release_at.is.null,release_at.lte.${now}`);
          
          return {
            ...category,
            icon: null as string | null,
            product_count: count || 0,
          };
        })
      );
      
      return categoriesWithCounts.filter(c => c.product_count > 0) as Category[];
    },
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-primary" />
          Categories
        </h3>
        <Link 
          to="/categories?source=marketplace" 
          className="text-xs font-normal text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}&source=marketplace`}
                className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-primary/20 transition-all"
              >
                {(() => {
                  const IconComp = categoryIconMap[category.slug] || PackageIcon;
                  return <IconComp className="h-6 w-6 text-muted-foreground" />;
                })()}
                <span className="font-medium text-sm text-center group-hover:text-primary transition-colors">
                  {category.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {category.product_count} items
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories available
          </p>
        )}
      </div>
    </div>
  );
}