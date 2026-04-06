import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCurrency } from '@/hooks/useCurrency';
import { Clock } from 'lucide-react';

interface Props {
  currentProductId?: string;
}

export function RecentlyViewedProducts({ currentProductId }: Props) {
  const { getRecent } = useRecentlyViewed();
  const { formatPrice } = useCurrency();
  const products = getRecent(currentProductId, 6);

  if (products.length === 0) return null;

  return (
    <section aria-label="Recently viewed products" className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Recently Viewed</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {products.map(product => (
          <Link
            key={product.id}
            to={`/products/${product.slug}`} /* slug field stores product_number */
            className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="aspect-square bg-foreground/10 overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-lg font-bold text-muted-foreground/30">{product.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="p-1.5">
              <p className="text-[10px] font-medium text-foreground truncate">{product.name}</p>
              <p className="text-[10px] font-bold text-muted-foreground">{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
