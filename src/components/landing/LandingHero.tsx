import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight, Store, Shield, Zap, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function LandingHero() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_homepage_stats');
      return data as { products_count: number; downloads_count: number; users_count: number } | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 sm:pt-10 sm:pb-4 lg:pt-16 lg:pb-6 relative z-10">
        {/* Main content */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider mb-4">
            <Zap className="h-3 w-3" />
            Roblox & Discord Marketplace
          </div>

          <h1
            id="hero-heading"
            className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold leading-[1.08] tracking-tight mb-3 sm:mb-4"
          >
            Find, buy & sell
            <br className="sm:hidden" />
            <span className="text-primary"> premium assets</span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mb-5 sm:mb-7 leading-relaxed">
            Scripts, models, UI kits and game assets from verified creators.
            Lower fees, instant delivery, enterprise-grade security.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Link to="/products">
              <Button size="lg" className="h-10 sm:h-11 px-5 sm:px-7 text-xs sm:text-sm font-semibold">
                Browse Marketplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link to="/sell">
                <Button size="lg" variant="outline" className="h-10 sm:h-11 px-5 sm:px-7 text-xs sm:text-sm font-semibold">
                  <Store className="mr-2 h-4 w-4" />
                  Start Selling
                </Button>
              </Link>
            )}
          </div>

          {/* Stats row */}
          {stats && (
            <div className="flex items-center gap-6 sm:gap-10 text-center">
              <div>
                <p className="text-lg sm:text-2xl font-bold tracking-tight">{formatStat(stats.products_count)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Products</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-lg sm:text-2xl font-bold tracking-tight">{formatStat(stats.downloads_count)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Downloads</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-lg sm:text-2xl font-bold tracking-tight">{formatStat(stats.users_count)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Creators</p>
              </div>
            </div>
          )}

          {/* Trust signals */}
          <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-6 text-[10px] sm:text-[11px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              256-bit SSL
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              Instant delivery
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Secure payments
            </span>
          </div>
        </div>
      </div>

      {/* Bottom separator */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-border/40" />
      </div>
    </section>
  );
}
