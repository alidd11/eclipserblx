import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Car, Code, Box, Layout, Gamepad2, Swords, MapPin, 
  Building2, Package, Layers 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'vehicle-liveries': Car,
  'vehicles': Car,
  'scripts-systems': Code,
  'scripts': Code,
  '3d-models': Box,
  'models': Box,
  'ui-kits': Layout,
  'games': Gamepad2,
  'weapons': Swords,
  'maps': MapPin,
  'buildings': Building2,
  'bundle-deals': Package,
};

export function CategoryBar() {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');

  const { data: categories } = useQuery({
    queryKey: ['categories-bar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, display_order')
        .order('display_order');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!categories?.length) return null;

  return (
    <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container">
         <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-2.5 -mx-1 px-1">
          <Link
            to="/products"
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 min-h-[36px]",
              !activeCategory
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            All
          </Link>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.slug] || Package;
            const isActive = activeCategory === cat.slug;
            return (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
