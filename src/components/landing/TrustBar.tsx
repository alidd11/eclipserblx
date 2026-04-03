import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ShieldCheck, Package, Store } from 'lucide-react';

export function TrustBar() {
  const { data: stats } = useQuery({
    queryKey: ['trust-bar-stats'],
    queryFn: async () => {
      const [productsRes, storesRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('moderation_status', 'approved'),
        supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      return {
        products: productsRes.count ?? 0,
        stores: storesRes.count ?? 0,
      };
    },
    staleTime: 30 * 60 * 1000,
  });

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4">
      <ScrollReveal direction="up" distance={12} duration={0.3}>
        <div className="flex items-center justify-center gap-6 sm:gap-10 text-center">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <div>
              {stats ? (
                <p className="text-sm font-bold">{stats.products.toLocaleString()}+</p>
              ) : (
                <Skeleton className="h-4 w-10" />
              )}
              <p className="text-[10px] text-muted-foreground">Products</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <div>
              {stats ? (
                <p className="text-sm font-bold">{stats.stores.toLocaleString()}+</p>
              ) : (
                <Skeleton className="h-4 w-10" />
              )}
              <p className="text-[10px] text-muted-foreground">Creators</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-bold">Secure</p>
              <p className="text-[10px] text-muted-foreground">Payments</p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
