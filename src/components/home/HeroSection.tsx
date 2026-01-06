import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function HeroSection() {
  const { data: stats } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: async () => {
      const [products, downloads, users] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('download_logs').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      return {
        products: products.count ?? 0,
        downloads: downloads.count ?? 0,
        users: users.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K+`;
    }
    return num.toString();
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="container mx-auto px-4 py-24 md:py-32 relative">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Premium Roblox Assets</span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Power Your Server{' '}
            <span className="gradient-text">With Eclipse</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional vehicle liveries, powerful scripts, stunning 3D models, and sleek UI kits. Everything you need to create an immersive roleplay experience.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center">
            <Link to="/products">
              <Button size="lg" className="gradient-button border-0 text-lg px-8">
                Browse Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="pt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="font-display text-3xl font-bold gradient-text">
                {stats?.products ?? 0}+
              </div>
              <div className="text-sm text-muted-foreground">Products</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold gradient-text">
                {formatNumber(stats?.downloads ?? 0)}
              </div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl font-bold gradient-text">
                {formatNumber(stats?.users ?? 0)}
              </div>
              <div className="text-sm text-muted-foreground">Happy Users</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
