import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  images?: string[] | null;
  product_number?: number;
}

interface RelatedProductsSectionProps {
  products: RelatedProduct[];
}

export function RelatedProductsSection({ products }: RelatedProductsSectionProps) {
  const { formatPrice } = useCurrency();

  if (!products.length) return null;

  return (
    <section className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Related Products</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map((p) => (
          <Link
            key={p.id}
            to={`/products/${(p as any).product_number}`}
            className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="aspect-square bg-muted overflow-hidden">
              {p.images?.[0] ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-lg font-bold text-muted-foreground/30">{p.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
              <p className="text-xs font-bold text-muted-foreground">{formatPrice(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
