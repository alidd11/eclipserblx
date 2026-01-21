import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

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
  } | null;
}

export function NewArrivalsCard() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          price,
          images,
          created_at,
          stores!inner (name, slug, is_active)
        `)
        .eq('is_active', true)
        .eq('stores.is_active', true)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return (data || []) as unknown as NewProduct[];
    },
  });

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          New Arrivals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
              to={`/product/${product.slug}`}
              className="group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="relative flex-shrink-0">
                {product.images && product.images[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="h-12 w-12 rounded-lg object-cover bg-muted"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
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
                    <span className="truncate">{product.stores.name}</span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(product.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-semibold text-sm text-primary">
                  £{product.price.toFixed(2)}
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
      </CardContent>
    </Card>
  );
}
