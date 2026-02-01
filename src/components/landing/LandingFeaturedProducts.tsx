import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';

interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
  } | null;
}

function ProductCard({ product }: { product: FeaturedProduct }) {
  const { formatPrice } = useCurrency();
  
  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <Card className="overflow-hidden h-full border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300">
        {/* Image */}
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
          
          {/* Store overlay at bottom */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3">
            <div className="flex items-center gap-2">
              {product.stores?.logo_url ? (
                <img 
                  src={product.stores.logo_url} 
                  alt={product.stores.name}
                  className="h-6 w-6 rounded-md object-contain bg-white/10"
                />
              ) : null}
              <span className="text-white text-xs font-medium truncate">
                {product.stores?.name}
              </span>
              {product.stores?.is_verified && (
                <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />
              )}
              {product.stores?.is_trusted && (
                <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-2">
            {product.name}
          </h3>
          
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3]" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </CardContent>
    </Card>
  );
}

export function LandingFeaturedProducts() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['landing-featured-products'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, images,
          stores!inner (name, slug, logo_url, is_verified, is_trusted, is_active, is_testing)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .eq('stores.is_active', true)
        .eq('stores.is_testing', false)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      return data as unknown as FeaturedProduct[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10"
        >
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2">
              Featured Products
            </h2>
            <p className="text-muted-foreground">
              Hand-picked by our team for quality and value
            </p>
          </div>
          <Link to="/products">
            <Button variant="outline" className="gap-2">
              View All Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))
          ) : products?.length ? (
            products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No featured products yet. Check back soon!
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
