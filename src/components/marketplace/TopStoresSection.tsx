import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ShieldCheck, Award, Users, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

function CompactStoreCard({ store }: { store: TopStore }) {
  const accentColor = store.accent_color || 'hsl(var(--primary))';

  return (
    <Link to={`/store/${store.slug}`} className="group block snap-start" style={{ minWidth: 260, width: 260 }}>
      <div className="relative overflow-hidden rounded-lg border border-border bg-card hover:border-primary/30 transition-colors duration-200 h-full active:scale-[0.98]">
        {/* Compact banner */}
        <div
          className="h-14 relative overflow-hidden"
          style={{
            background: store.banner_url
              ? `url(${store.banner_url}) center/cover`
              : `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          {/* Badges in banner */}
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
            {store.is_trusted && (
              <Badge className="text-[9px] px-1 py-0 gap-0.5 bg-amber-500 text-white border-0">
                <Award className="h-2.5 w-2.5" />
                Trusted
              </Badge>
            )}
            {store.is_verified && !store.is_trusted && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 gap-0.5">
                <ShieldCheck className="h-2.5 w-2.5" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-3 pb-3 -mt-5 relative">
          <div className="flex items-end gap-2.5 mb-2">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-10 w-10 rounded-md object-contain bg-background shadow-sm flex-shrink-0 border border-border"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center shadow-sm flex-shrink-0 border border-border bg-background"
              >
                <Store className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1 pb-0.5">
              <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                {store.name}
              </h3>
            </div>
          </div>

          {store.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2 leading-relaxed">
              {store.description}
            </p>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {store.follower_count.toLocaleString()}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function CompactStoreSkeleton() {
  return (
    <div className="snap-start rounded-lg border border-border bg-card overflow-hidden" style={{ minWidth: 260, width: 260 }}>
      <Skeleton className="h-14 rounded-none" />
      <div className="px-3 pb-3 -mt-5 relative">
        <div className="flex items-end gap-2.5 mb-2">
          <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function TopStoresSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

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
        .limit(6);
      
      if (error) throw error;
      return data as TopStore[];
    },
  });

  if (!isLoading && (!stores || stores.length === 0)) {
    return null;
  }

  return (
    <section className="space-y-3 -mx-4 overflow-hidden">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold text-foreground">Featured Stores</h2>
        <Link
          to="/stores"
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-1 [-webkit-overflow-scrolling:touch]"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <CompactStoreSkeleton key={i} />)
          : stores!.map((store) => <CompactStoreCard key={store.id} store={store} />)
        }
      </div>
    </section>
  );
}
