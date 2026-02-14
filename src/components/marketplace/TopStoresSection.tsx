import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ShieldCheck, Award, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface TopStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  is_verified: boolean;
  is_trusted: boolean;
  follower_count: number;
}

export function TopStoresSection() {
  const { data: stores, isLoading } = useQuery({
    queryKey: ['top-stores-featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, is_trusted, follower_count')
        .eq('status', 'approved')
        .eq('is_active', true)
        .eq('is_testing', false)
        .order('is_trusted', { ascending: false })
        .order('is_verified', { ascending: false })
        .order('follower_count', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data as TopStore[];
    },
  });

  if (!isLoading && (!stores || stores.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Featured Store</h2>
        <Skeleton className="w-full aspect-[16/9] rounded-xl" />
      </section>
    );
  }

  const store = stores![0];
  const accentColor = store.accent_color || 'hsl(var(--primary))';

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Featured Store</h2>
        <Link
          to="/stores"
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <Link to={`/store/${store.slug}`} className="group block">
        <div
          className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border"
          style={{
            background: store.banner_url
              ? `url(${store.banner_url}) center/cover`
              : `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`,
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6">
            {/* Badges */}
            <div className="flex items-center gap-1.5 mb-2">
              {store.is_trusted && (
                <Badge className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-amber-500 text-white border-0">
                  <Award className="h-2.5 w-2.5" />
                  Trusted Seller
                </Badge>
              )}
              {store.is_verified && !store.is_trusted && (
                <Badge className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-blue-500/80 text-white border-0">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </Badge>
              )}
            </div>

            {/* Store info */}
            <div className="flex items-center gap-2.5 mb-2">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="h-10 w-10 rounded-lg object-contain bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0">
                  <Store className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-white truncate group-hover:text-primary transition-colors">
                  {store.name}
                </h3>
                {store.description && (
                  <p className="text-xs text-white/70 line-clamp-1">{store.description}</p>
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-fit text-xs"
              tabIndex={-1}
            >
              Visit Store
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </Link>
    </section>
  );
}
