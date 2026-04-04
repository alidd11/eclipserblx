import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
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

export function GlobalCategoryBar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  const isShopPage = location.pathname === '/products';

  const { data: categories } = useQuery({
    queryKey: ['global-categories-bar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, display_order')
        .order('display_order');
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!categories?.length) return null;

  return (
    <div className="border-b border-border/30">
      <div className="container">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 -mx-1 px-1">
          <Link
            to="/products"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
              isShopPage && !activeCategory
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Layers className="h-3 w-3" />
            All
          </Link>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.slug] || Package;
            const isActive = isShopPage && activeCategory === cat.slug;
            return (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3 w-3" />
                {cat.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
