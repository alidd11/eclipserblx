import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ChevronRight, Clock, BadgeCheck, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatRelative } from '@/lib/dateUtils';
import { useCurrency } from '@/hooks/useCurrency';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { getFirstImageUrl } from '@/lib/mediaUtils';

interface NewProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  created_at: string;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
  } | null;
}

export function NewArrivalsCard() {
  const { formatPrice } = useCurrency();
  const { data: products, isLoading } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, product_number,
          name,
          slug,
          price,
          images,
          created_at,
          stores (name, slug, logo_url, is_verified, is_trusted, is_active)
        `)
        .eq('is_active', true)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      const filtered = (data || []).filter(p => p.stores?.is_active === true);
      return filtered.slice(0, 5) as unknown as NewProduct[];
    } });

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 bg-muted/30 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          New Arrivals
        </h3>
      </div>
      <div className="p-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : products && products.length > 0 ? (
          products.map((product) => (
            <Link
              key={product.id}
              to={`/products/${(product as any).product_number}`}
              className="group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="relative flex-shrink-0">
                {(() => {
                  const imgUrl = getFirstImageUrl(product.images);
                  return imgUrl ? (
                    <img 
                      src={optimizeImageUrl(imgUrl, 48, 48)} 
                      alt={product.name}
                      width={48}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 rounded-lg object-contain bg-muted"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  );
                })()}
                <Badge 
                  className="absolute -top-1 -right-1 text-[8px] px-1 py-0 bg-emerald-500 hover:bg-emerald-500"
                >
                  NEW
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {product.name}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {product.stores && (
                    <span className="flex items-center gap-1 truncate">
                      {product.stores.name}
                      {product.stores.is_verified && (
                        <BadgeCheck className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      )}
                      {product.stores.is_trusted && (
                        <Shield className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {formatRelative(product.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-semibold text-sm text-primary">
                  {formatPrice(Number(product.price))}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No products available yet
          </p>
        )}
      </div>
    </div>
  );
}