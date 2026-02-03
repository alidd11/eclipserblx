import { Link } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStats {
  totalSales: number;
  totalPurchases: number;
  productsUploaded: number;
}

function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats-landing'],
    queryFn: async (): Promise<PlatformStats> => {
      // Fetch all stats in parallel
      const [salesResult, purchasesResult, productsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('total')
          .eq('status', 'completed'),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed'),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
      ]);

      // Calculate total sales
      const totalSales = salesResult.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      
      return {
        totalSales,
        totalPurchases: purchasesResult.count || 0,
        productsUploaded: productsResult.count || 0,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

function formatStatNumber(num: number, isCurrency = false): string {
  if (isCurrency) {
    if (num >= 1000000) {
      return `£${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `£${(num / 1000).toFixed(1)}K`;
    }
    return `£${num.toFixed(0)}`;
  }
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function PWALandingHero() {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();

  return (
    <div 
      className="flex flex-col min-h-[calc(100dvh-4rem)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Main Hero Content - centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Headline */}
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-center leading-tight tracking-tight mb-4">
          The All-In-One Platform for{' '}
          <span className="text-primary">Roblox Creators</span>
        </h1>

        {/* Tagline */}
        <p className="text-muted-foreground text-center text-lg max-w-md mb-10 leading-relaxed">
          Buy and sell premium scripts, assets, and resources. 
          Low fees. Instant payouts. Trusted by thousands.
        </p>

        {/* CTA Buttons */}
        <div className="w-full max-w-sm space-y-3">
          <Link to="/marketplace" className="block">
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-semibold rounded-full"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Shop
            </Button>
          </Link>
          
          <Link to="/seller" className="block">
            <Button 
              size="lg" 
              variant="outline"
              className="w-full h-14 text-lg font-semibold rounded-full"
            >
              <Store className="mr-2 h-5 w-5" />
              Open a Store
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="border-t border-border bg-muted/30 px-6 py-6">
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {/* Processed Sales */}
          <div className="text-center">
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {formatStatNumber(stats?.totalSales || 0, true)}
              </div>
            )}
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Processed
            </div>
          </div>

          {/* Total Purchases */}
          <div className="text-center">
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {formatStatNumber(stats?.totalPurchases || 0)}
              </div>
            )}
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Purchases
            </div>
          </div>

          {/* Products Uploaded */}
          <div className="text-center">
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mx-auto mb-1" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {formatStatNumber(stats?.productsUploaded || 0)}
              </div>
            )}
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Products
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
