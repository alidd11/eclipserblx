import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCurrency } from '@/hooks/useCurrency';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Clock } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';

export function RecentlyViewedSection() {
  const { recentlyViewed } = useRecentlyViewed();
  const { formatPrice } = useCurrency();

  if (!recentlyViewed || recentlyViewed.length === 0) return null;

  const items = recentlyViewed.slice(0, 8);

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-bold tracking-tight uppercase">Recently Viewed</h2>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {items.map((product) => (
            <Link key={product.id} to={`/products/${product.slug}`} className="block min-w-[140px] lg:min-w-0 group">
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted border border-border">
                {product.image ? (
                  <img
                    src={optimizeImageUrl(product.image, 360, 270, 'contain')}
                    alt={product.name}
                    className="w-full h-full object-contain object-center"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-bold">
                    {product.name.charAt(0)}
                  </div>
                )}
              </div>
              <p className="text-xs font-medium mt-1.5 truncate group-hover:text-primary transition-colors">{product.name}</p>
              <p className="text-[11px] font-semibold text-foreground">{formatPrice(product.price)}</p>
            </Link>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
