import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect } from 'react';

export function ShopSidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  const priceMaxParam = searchParams.get('maxPrice');
  const ratingParam = searchParams.get('minRating');

  const [priceRange, setPriceRange] = useState<number[]>([priceMaxParam ? parseInt(priceMaxParam) : 500]);
  const [minRating, setMinRating] = useState<number>(ratingParam ? parseInt(ratingParam) : 0);

  const { data: categories } = useQuery({
    queryKey: ['sidebar-categories'],
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (priceRange[0] < 500) {
        newParams.set('maxPrice', priceRange[0].toString());
      } else {
        newParams.delete('maxPrice');
      }
      if (minRating > 0) {
        newParams.set('minRating', minRating.toString());
      } else {
        newParams.delete('minRating');
      }
      setSearchParams(newParams, { replace: true });
    }, 400);
    return () => clearTimeout(timeout);
  }, [priceRange, minRating]);

  return (
    <aside className="hidden lg:block w-56 flex-shrink-0 space-y-5">
      {/* Categories */}
      <div>
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Categories</h3>
        <div className="space-y-0.5">
          <Link
            to="/products"
            className={cn(
              "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
              !activeCategory
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            All Products
          </Link>
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className={cn(
                "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                activeCategory === cat.slug
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Price Range</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={500}
          step={5}
          className="mb-2"
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>$0</span>
          <span className="font-medium text-foreground">{priceRange[0] >= 500 ? 'Any' : `≤ $${priceRange[0]}`}</span>
        </div>
      </div>

      {/* Minimum Rating */}
      <div>
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Min Rating</h3>
        <div className="space-y-1">
          {[0, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => setMinRating(rating)}
              className={cn(
                "flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md text-xs transition-colors",
                minRating === rating
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {rating === 0 ? (
                'Any'
              ) : (
                <>
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span>& up</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
